import { useState, useEffect, useMemo } from "react";
import api from "../api";
import { 
  LayoutGrid, 
  FileText, 
  Users, 
  Calendar, 
  UserCheck, 
  Clock, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  ArrowRight, 
  X, 
  MapPin, 
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  Layers,
  Flame,
  Radio
} from "lucide-react";
import "./EmployeeCards.css";
import "./OverviewDashboard.css";
import OrderManagementDashboard from "./OrderManagementDashboard";

const employees = [
  { id: 1, name: "Noah Castell", initials: "NC", role: "Project Lead", department: "Management", openTasks: 0, completedTasks: 48, workload: 64, avatarBg: "#ffedd5", status: "online" },
  { id: 2, name: "Priya Raman", initials: "PR", role: "Product Designer", department: "Design", openTasks: 1, completedTasks: 35, workload: 72, avatarBg: "#e2e8f0", status: "online" },
  { id: 3, name: "Mateo Silva", initials: "MS", role: "Backend Engineer", department: "Engineering", openTasks: 2, completedTasks: 51, workload: 88, avatarBg: "#d1fae5", status: "online" },
  { id: 4, name: "Hana Kobayashi", initials: "HK", role: "Frontend Engineer", department: "Engineering", openTasks: 1, completedTasks: 33, workload: 56, avatarBg: "#e0e7ff", status: "away" },
  { id: 5, name: "Owen Mercer", initials: "OM", role: "Frontend Engineer", department: "Engineering", openTasks: 2, completedTasks: 42, workload: 79, avatarBg: "#fef08a", status: "online" },
  { id: 6, name: "Sofia Sato", initials: "SS", role: "QA Engineer", department: "Engineering", openTasks: 1, completedTasks: 27, workload: 41, avatarBg: "#f3e8ff", status: "away" },
  { id: 7, name: "Maya Kovac", initials: "MK", role: "Brand Designer", department: "Design", openTasks: 2, completedTasks: 24, workload: 50, avatarBg: "#dbeafe", status: "away" },
  { id: 8, name: "Liam Reyes", initials: "LR", role: "Marketing Lead", department: "Marketing", openTasks: 1, completedTasks: 30, workload: 67, avatarBg: "#ffedd5", status: "away" }
];

const getWorkloadColor = (workload) => {
  if (workload > 80) return "#d97706";
  return "#059669";
};

function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Live Leads and Production Data from Backend
  const [leads, setLeads] = useState([]);

  // UI Interactive States
  const [chartViewMode, setChartViewMode] = useState("volume"); // "volume" | "revenue"
  const [selectedStageFilter, setSelectedStageFilter] = useState("all"); // "all" | "sample" | "partial" | "complete"
  const [hoveredStack, setHoveredStack] = useState(null); // tooltip data for main chart
  const [hoveredDay, setHoveredDay] = useState(null); // tooltip data for velocity chart
  const [showRepeatDetailsModal, setShowRepeatDetailsModal] = useState(false);
  const [activeDonutHover, setActiveDonutHover] = useState({ onboarding: null, offboarding: null });

  // Fetch leads and check backend health on mount
  useEffect(() => {
    api.get("/api/health")
      .then((res) => console.log("Backend connected:", res.data))
      .catch((err) => console.warn("Backend health check failed:", err.message));

    api.get("/api/leads")
      .then((res) => {
        if (res.data?.data) {
          setLeads(res.data.data);
        }
      })
      .catch((err) => {
        console.warn("Leads fetch failed, using realistic baseline:", err.message);
      });
  }, []);

  // Compute live repeat customer rate linked to lead form field `repeatedOrder`
  const repeatCustomerStats = useMemo(() => {
    const hasLiveLeads = leads.length > 0;
    const totalCount = hasLiveLeads ? leads.length : 25;
    
    // Count leads where repeatedOrder === "Yes" (matching create lead form radio value)
    const repeatLeads = hasLiveLeads
      ? leads.filter(l => (l.repeatedOrder || "").toLowerCase().trim() === "yes")
      : [
          { clientName: "Acme Apparel", orderStage: "complete", netAmount: 1850, repeatedOrder: "Yes", createdAt: "2026-10-02" },
          { clientName: "Vortex Athletics", orderStage: "partial", netAmount: 2400, repeatedOrder: "Yes", createdAt: "2026-10-04" },
          { clientName: "Summit Brand Studio", orderStage: "sample", netAmount: 650, repeatedOrder: "Yes", createdAt: "2026-10-05" },
          { clientName: "Urban Stitch Co", orderStage: "complete", netAmount: 3100, repeatedOrder: "Yes", createdAt: "2026-09-28" },
          { clientName: "Prime Uniforms", orderStage: "partial", netAmount: 1450, repeatedOrder: "Yes", createdAt: "2026-09-24" },
        ];
    
    const repeatCount = hasLiveLeads ? repeatLeads.length : 17;
    const firstTimeCount = totalCount - repeatCount;
    const rate = Math.round((repeatCount / totalCount) * 100);
    const target = 80;

    return {
      totalCount,
      repeatCount,
      firstTimeCount,
      rate,
      target,
      isLive: hasLiveLeads,
      repeatLeads
    };
  }, [leads]);

  // Compute live stage counts for Sample, Partial, Complete
  const stageStats = useMemo(() => {
    const hasLiveLeads = leads.length > 0;
    
    const sampleLeads = leads.filter(l => (l.orderStage || "sample").toLowerCase().trim() === "sample");
    const partialLeads = leads.filter(l => (l.orderStage || "").toLowerCase().trim() === "partial");
    const completeLeads = leads.filter(l => (l.orderStage || "").toLowerCase().trim() === "complete");

    const sampleCount = hasLiveLeads ? (sampleLeads.length || 1) : 28;
    const partialCount = hasLiveLeads ? (partialLeads.length || 1) : 46;
    const completeCount = hasLiveLeads ? (completeLeads.length || 1) : 41;
    const total = sampleCount + partialCount + completeCount;

    return {
      sample: { count: sampleCount, pct: Math.round((sampleCount / total) * 100) },
      partial: { count: partialCount, pct: Math.round((partialCount / total) * 100) },
      complete: { count: completeCount, pct: 100 - Math.round((sampleCount / total) * 100) - Math.round((partialCount / total) * 100) },
      total
    };
  }, [leads]);

  // Monthly dataset for the Sample / Partial / Complete Production & Orders Overview
  const monthlyStageData = useMemo(() => {
    return [
      {
        month: "Oct",
        totalLabelUnits: "340 Units",
        totalLabelRevenue: "$ 2,988.20",
        stages: {
          sample: { count: 85, revenue: "$ 740.00", pct: 25, h: 26, color: "#6366f1" },
          partial: { count: 125, revenue: "$ 1,120.00", pct: 37, h: 36, color: "#f59e0b" },
          complete: { count: 130, revenue: "$ 1,128.20", pct: 38, h: 38, color: "#10b981" },
        }
      },
      {
        month: "Nov",
        totalLabelUnits: "280 Units",
        totalLabelRevenue: "$ 1,765.09",
        stages: {
          sample: { count: 60, revenue: "$ 480.00", pct: 21, h: 20, color: "#6366f1" },
          partial: { count: 110, revenue: "$ 690.00", pct: 39, h: 30, color: "#f59e0b" },
          complete: { count: 110, revenue: "$ 595.09", pct: 40, h: 30, color: "#10b981" },
        }
      },
      {
        month: "Dec",
        totalLabelUnits: "460 Units",
        totalLabelRevenue: "$ 4,504.22",
        stages: {
          sample: { count: 110, revenue: "$ 1,120.00", pct: 24, h: 34, color: "#6366f1" },
          partial: { count: 180, revenue: "$ 1,780.00", pct: 39, h: 48, color: "#f59e0b" },
          complete: { count: 170, revenue: "$ 1,604.22", pct: 37, h: 48, color: "#10b981" },
        }
      }
    ];
  }, []);

  // Weekly Order Velocity Data
  const weeklyVelocityData = [
    { day: "Mon", standard: 10, urgent: 4, total: 14, isPeak: false },
    { day: "Tue", standard: 13, urgent: 5, total: 18, isPeak: true },
    { day: "Wed", standard: 9, urgent: 3, total: 12, isPeak: false },
    { day: "Thu", standard: 7, urgent: 2, total: 9, isPeak: false },
    { day: "Fri", standard: 11, urgent: 4, total: 15, isPeak: false },
    { day: "Sat", standard: 6, urgent: 2, total: 8, isPeak: false },
    { day: "Sun", standard: 4, urgent: 1, total: 5, isPeak: false },
  ];

  // Workforce stats from employees array
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === "online").length;
  const leaveEmployees = employees.filter(e => e.status === "away").length;
  const activePct = Math.round((activeEmployees / totalEmployees) * 100);

  return (
    <div className="dashboard-page">
      <div className="dashboard-tabs">
        <button className={`tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
          <LayoutGrid size={18} /> Overview
        </button>
        <button className={`tab ${activeTab === "case" ? "active" : ""}`} onClick={() => setActiveTab("case")}>
          <FileText size={18} /> Order Management
        </button>
        <button className={`tab ${activeTab === "employee" ? "active" : ""}`} onClick={() => setActiveTab("employee")}>
          <Users size={18} /> Employee Management
        </button>
        <button className={`tab ${activeTab === "leave" ? "active" : ""}`} onClick={() => setActiveTab("leave")}>
          <Calendar size={18} /> Leave Management
        </button>
      </div>

      <div className="page-header dashboard-header">
        <div>
          <h1>
            {activeTab === "overview" && "Overview"}
            {activeTab === "case" && "Order Management"}
            {activeTab === "employee" && "Employee Management"}
            {activeTab === "leave" && "Leave Management"}
          </h1>
        </div>

        <div className="date-picker">
          <CalendarIcon size={16} />
          <span>Monday, October 5, 2026</span>
          <ChevronDown size={16} />
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="overview-container">
          {/* Top Metric Tiles */}
          <div className="overview-tiles-grid">
            {/* Tile 1: Total Workforce */}
            <div className="overview-tile tile-workforce" onClick={() => setActiveTab("employee")}>
              <div className="tile-top">
                <div className="tile-icon-badge blue">
                  <Users size={22} />
                </div>
                <span className="tile-trend-pill positive">
                  <TrendingUp size={12} /> +2
                </span>
              </div>
              <div className="tile-main">
                <span className="tile-label">Total Workforce</span>
                <div className="tile-num-row">
                  <span className="tile-number">{totalEmployees}</span>
                </div>
              </div>
              <div className="tile-capacity-bar">
                <div className="tile-capacity-fill blue" style={{ width: "100%" }}></div>
              </div>
              <div className="tile-footer-action">
                <span>View all employees</span>
                <ArrowRight size={14} className="arrow-icon" />
              </div>
            </div>

            {/* Tile 2: Active on Duty */}
            <div className="overview-tile tile-active" onClick={() => setActiveTab("employee")}>
              <div className="tile-top">
                <div className="tile-icon-badge green">
                  <UserCheck size={22} />
                </div>
                <span className="tile-trend-pill live">
                  {activePct}% on duty
                </span>
              </div>
              <div className="tile-main">
                <span className="tile-label">Active Employees</span>
                <div className="tile-num-row">
                  <span className="tile-number">{activeEmployees}</span>
                </div>
              </div>
              <div className="tile-capacity-bar">
                <div className="tile-capacity-fill green" style={{ width: `${activePct}%` }}></div>
              </div>
              <div className="tile-footer-action">
                <span>View online roster</span>
                <ArrowRight size={14} className="arrow-icon" />
              </div>
            </div>

            {/* Tile 3: On Leave Today */}
            <div className="overview-tile tile-leave" onClick={() => setActiveTab("leave")}>
              <div className="tile-top">
                <div className="tile-icon-badge orange">
                  <Clock size={22} />
                </div>
                <span className="tile-trend-pill neutral">
                  88% coverage
                </span>
              </div>
              <div className="tile-main">
                <span className="tile-label">On Leave Today</span>
                <div className="tile-num-row">
                  <span className="tile-number">{leaveEmployees}</span>
                </div>
              </div>
              <div className="tile-capacity-bar">
                <div className="tile-capacity-fill orange" style={{ width: `${(leaveEmployees / totalEmployees) * 100}%` }}></div>
              </div>
              <div className="tile-footer-action">
                <span>Manage leave calendar</span>
                <ArrowRight size={14} className="arrow-icon" />
              </div>
            </div>
          </div>

          {/* Middle Row: Production & Sales Overview + Repeat Customer Rate + Weekly Order Velocity */}
          <div className="overview-mid-row">
            {/* Left: Sales & Stage Overview (Sample, Partial, Complete) */}
            <div className="ov-card stage-chart-card">
              <div className="stage-chart-header">
                <div className="stage-chart-title-group">
                  <h3>
                    <Layers size={18} color="#6366f1" /> Production & Sales Overview
                  </h3>
                  <div className="stage-chart-metrics-row">
                    <span className="stage-primary-kpi">
                      {chartViewMode === "volume" ? "1,080 Units" : "$ 9,257.51"}
                    </span>
                    <span className="stage-trend-pill">
                      <TrendingUp size={13} /> +18.4%
                    </span>
                  </div>
                </div>

                <div className="chart-view-toggle">
                  <button 
                    className={`chart-toggle-btn ${chartViewMode === "volume" ? "active" : ""}`}
                    onClick={() => setChartViewMode("volume")}
                  >
                    Units
                  </button>
                  <button 
                    className={`chart-toggle-btn ${chartViewMode === "revenue" ? "active" : ""}`}
                    onClick={() => setChartViewMode("revenue")}
                  >
                    Revenue ($)
                  </button>
                </div>
              </div>

              {/* Stage Quick Filter Chips */}
              <div className="stage-chips-strip">
                <button 
                  className={`stage-chip ${selectedStageFilter === "all" ? "active" : ""}`}
                  onClick={() => setSelectedStageFilter("all")}
                >
                  All Stages <span className="stage-chip-count">{stageStats.total}</span>
                </button>
                <button 
                  className={`stage-chip chip-sample ${selectedStageFilter === "sample" ? "active" : ""}`}
                  onClick={() => setSelectedStageFilter(selectedStageFilter === "sample" ? "all" : "sample")}
                >
                  <span className="stage-chip-dot sample"></span>
                  Sample <span className="stage-chip-count">{stageStats.sample.count} ({stageStats.sample.pct}%)</span>
                </button>
                <button 
                  className={`stage-chip chip-partial ${selectedStageFilter === "partial" ? "active" : ""}`}
                  onClick={() => setSelectedStageFilter(selectedStageFilter === "partial" ? "all" : "partial")}
                >
                  <span className="stage-chip-dot partial"></span>
                  Partial <span className="stage-chip-count">{stageStats.partial.count} ({stageStats.partial.pct}%)</span>
                </button>
                <button 
                  className={`stage-chip chip-complete ${selectedStageFilter === "complete" ? "active" : ""}`}
                  onClick={() => setSelectedStageFilter(selectedStageFilter === "complete" ? "all" : "complete")}
                >
                  <span className="stage-chip-dot complete"></span>
                  Complete <span className="stage-chip-count">{stageStats.complete.count} ({stageStats.complete.pct}%)</span>
                </button>
              </div>

              {/* Interactive SVG Stacked Stage Chart */}
              <div className="stage-chart-body" onMouseLeave={() => setHoveredStack(null)}>
                <svg viewBox="0 0 600 240" className="stage-chart-svg">
                  <defs>
                    <linearGradient id="sampleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <linearGradient id="partialGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="completeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>

                    <linearGradient id="flowSample" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.14" />
                    </linearGradient>
                    <linearGradient id="flowPartial" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.12" />
                    </linearGradient>
                    <linearGradient id="flowComplete" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.14" />
                    </linearGradient>
                  </defs>

                  <line x1="40" y1="50" x2="560" y2="50" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="40" y1="120" x2="560" y2="120" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="40" y1="190" x2="560" y2="190" stroke="#f1f5f9" strokeWidth="1" />

                  {(() => {
                    const colWidth = 84;
                    const gap = 5;
                    const xCenters = [110, 300, 490];
                    const elements = [];

                    const columnsData = monthlyStageData.map((d, i) => {
                      let currentY = 190;
                      const xLeft = xCenters[i] - colWidth / 2;

                      const keys = ["complete", "partial", "sample"];
                      const stacks = keys.map((k) => {
                        const stageInfo = d.stages[k];
                        const h = stageInfo.h;
                        const yTop = currentY - h;
                        currentY = yTop - gap;

                        const isDimmed = selectedStageFilter !== "all" && selectedStageFilter !== k;

                        return {
                          key: k,
                          xLeft,
                          yTop,
                          h,
                          color: stageInfo.color,
                          gradient: k === "sample" ? "url(#sampleGrad)" : k === "partial" ? "url(#partialGrad)" : "url(#completeGrad)",
                          info: stageInfo,
                          month: d.month,
                          totalUnits: d.totalLabelUnits,
                          totalRevenue: d.totalLabelRevenue,
                          isDimmed
                        };
                      });

                      return { xCenter: xCenters[i], stacks, month: d.month, totalRevenue: d.totalLabelRevenue, totalUnits: d.totalLabelUnits };
                    });

                    // Flow ribbons
                    for (let i = 0; i < columnsData.length - 1; i++) {
                      const colA = columnsData[i];
                      const colB = columnsData[i + 1];

                      colA.stacks.forEach((stackA, sIdx) => {
                        const stackB = colB.stacks[sIdx];
                        const isDimmed = selectedStageFilter !== "all" && selectedStageFilter !== stackA.key;
                        const flowGrad = stackA.key === "sample" ? "url(#flowSample)" : stackA.key === "partial" ? "url(#flowPartial)" : "url(#flowComplete)";

                        const path = `M ${stackA.xLeft + colWidth} ${stackA.yTop} 
                                      C ${stackA.xLeft + colWidth + 50} ${stackA.yTop}, ${stackB.xLeft - 50} ${stackB.yTop}, ${stackB.xLeft} ${stackB.yTop} 
                                      L ${stackB.xLeft} ${stackB.yTop + stackB.h} 
                                      C ${stackB.xLeft - 50} ${stackB.yTop + stackB.h}, ${stackA.xLeft + colWidth + 50} ${stackA.yTop + stackA.h}, ${stackA.xLeft + colWidth} ${stackA.yTop + stackA.h} Z`;

                        elements.push(
                          <path
                            key={`flow-${i}-${stackA.key}`}
                            d={path}
                            fill={flowGrad}
                            className="chart-flow-path"
                            opacity={isDimmed ? 0.05 : 0.85}
                          />
                        );
                      });
                    }

                    // Rectangles and labels
                    columnsData.forEach((col, i) => {
                      col.stacks.forEach((stack) => {
                        elements.push(
                          <rect
                            key={`rect-${i}-${stack.key}`}
                            x={stack.xLeft}
                            y={stack.yTop}
                            width={colWidth}
                            height={stack.h}
                            rx="8"
                            fill={stack.gradient}
                            opacity={stack.isDimmed ? 0.2 : 1}
                            className="chart-bar-rect"
                            onMouseEnter={() => {
                              setHoveredStack({
                                x: stack.xLeft + colWidth / 2,
                                y: stack.yTop,
                                month: col.month,
                                stageKey: stack.key,
                                count: stack.info.count,
                                revenue: stack.info.revenue,
                                pct: stack.info.pct,
                                totalRevenue: col.totalRevenue,
                                totalUnits: col.totalUnits
                              });
                            }}
                          />
                        );
                      });

                      const topStack = col.stacks[col.stacks.length - 1];
                      elements.push(
                        <text
                          key={`top-total-${i}`}
                          x={col.xCenter}
                          y={topStack.yTop - 12}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="700"
                          fill="#0f172a"
                        >
                          {chartViewMode === "volume" ? col.totalUnits : col.totalRevenue}
                        </text>
                      );

                      elements.push(
                        <text
                          key={`label-${i}`}
                          x={col.xCenter}
                          y="215"
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="600"
                          fill="#64748b"
                        >
                          {col.month} 2026
                        </text>
                      );
                    });

                    return elements;
                  })()}
                </svg>

                {hoveredStack && (
                  <div 
                    className="chart-floating-tooltip"
                    style={{ left: `${(hoveredStack.x / 600) * 100}%`, top: `${(hoveredStack.y / 240) * 100}%` }}
                  >
                    <div className="tooltip-header">
                      <span>{hoveredStack.month} Breakdown</span>
                      <span style={{ textTransform: "capitalize", color: hoveredStack.stageKey === "sample" ? "#818cf8" : hoveredStack.stageKey === "partial" ? "#fbbf24" : "#34d399" }}>
                        {hoveredStack.stageKey}
                      </span>
                    </div>
                    <div className="tooltip-row">
                      <span>Stage Volume:</span>
                      <strong>{hoveredStack.count} Units ({hoveredStack.pct}%)</strong>
                    </div>
                    <div className="tooltip-row">
                      <span>Stage Value:</span>
                      <strong>{hoveredStack.revenue}</strong>
                    </div>
                    <div className="tooltip-row" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "4px", marginTop: "4px" }}>
                      <span>Month Total:</span>
                      <span style={{ color: "#cbd5e1" }}>{chartViewMode === "volume" ? hoveredStack.totalUnits : hoveredStack.totalRevenue}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chart Legend */}
              <div className="stage-chart-legend">
                <div 
                  className="stage-legend-item" 
                  onClick={() => setSelectedStageFilter(selectedStageFilter === "sample" ? "all" : "sample")}
                >
                  <span className="stage-legend-dot" style={{ background: "#6366f1" }}></span>
                  <span>Sample</span>
                  <span className="stage-legend-val">({stageStats.sample.count} · {stageStats.sample.pct}%)</span>
                </div>
                <div 
                  className="stage-legend-item" 
                  onClick={() => setSelectedStageFilter(selectedStageFilter === "partial" ? "all" : "partial")}
                >
                  <span className="stage-legend-dot" style={{ background: "#f59e0b" }}></span>
                  <span>Partial</span>
                  <span className="stage-legend-val">({stageStats.partial.count} · {stageStats.partial.pct}%)</span>
                </div>
                <div 
                  className="stage-legend-item" 
                  onClick={() => setSelectedStageFilter(selectedStageFilter === "complete" ? "all" : "complete")}
                >
                  <span className="stage-legend-dot" style={{ background: "#10b981" }}></span>
                  <span>Complete</span>
                  <span className="stage-legend-val">({stageStats.complete.count} · {stageStats.complete.pct}%)</span>
                </div>
              </div>
            </div>

            {/* Right Side: Repeat Customer Rate + Weekly Order Velocity */}
            <div className="overview-right-column">
              {/* Widget 1: Repeat Customer Rate */}
              <div className="ov-card repeat-rate-card">
                <div className="card-header-clean">
                  <div>
                    <h3>Repeat Customer Rate</h3>
                  </div>
                  <button 
                    className="clean-icon-btn" 
                    title="Live calculated from leads" 
                    onClick={() => setShowRepeatDetailsModal(true)}
                  >
                    <HelpCircle size={17} />
                  </button>
                </div>

                <div className="repeat-gauge-body">
                  <svg viewBox="0 0 200 115" className="repeat-gauge-svg">
                    <defs>
                      <linearGradient id="gaugeActiveGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                    </defs>

                    {Array.from({ length: 40 }).map((_, i) => {
                      const totalTicks = 40;
                      const activeTicks = Math.round(totalTicks * (repeatCustomerStats.rate / 100));
                      const angle = Math.PI - (i / (totalTicks - 1)) * Math.PI;
                      const radius = 76;
                      const cx = 100;
                      const cy = 96;

                      const x1 = cx + (radius - 10) * Math.cos(angle);
                      const y1 = cy - (radius - 10) * Math.sin(angle);
                      const x2 = cx + (radius + 8) * Math.cos(angle);
                      const y2 = cy - (radius + 8) * Math.sin(angle);

                      const isActive = i < activeTicks;
                      const isTargetMark = i === Math.round(totalTicks * (repeatCustomerStats.target / 100));

                      return (
                        <g key={i}>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={isActive ? "url(#gaugeActiveGrad)" : "#e2e8f0"}
                            strokeWidth={isTargetMark ? "4" : "3"}
                            strokeLinecap="round"
                            className={`repeat-tick ${isActive ? "repeat-tick-active" : ""}`}
                          />
                          {isTargetMark && (
                            <circle
                              cx={cx + (radius + 16) * Math.cos(angle)}
                              cy={cy - (radius + 16) * Math.sin(angle)}
                              r="2.5"
                              fill="#f59e0b"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  <div className="repeat-gauge-center">
                    <span className="repeat-percentage">{repeatCustomerStats.rate}%</span>
                    <span className="repeat-target-status">
                      <Sparkles size={13} />
                      {repeatCustomerStats.rate >= repeatCustomerStats.target
                        ? `Target exceeded (+${repeatCustomerStats.rate - repeatCustomerStats.target}%)`
                        : `Target ${repeatCustomerStats.target}%`}
                    </span>
                    <span className="repeat-sync-source">
                      <Radio size={11} color="#10b981" />
                      {repeatCustomerStats.repeatCount} / {repeatCustomerStats.totalCount} orders
                    </span>
                  </div>
                </div>

                <div className="repeat-footer-stats">
                  <div className="repeat-stat-col">
                    <span className="repeat-stat-label">Repeat</span>
                    <span className="repeat-stat-val" style={{ color: "#059669" }}>
                      {repeatCustomerStats.repeatCount} ({repeatCustomerStats.rate}%)
                    </span>
                  </div>
                  <div className="repeat-stat-col">
                    <span className="repeat-stat-label">First-Time</span>
                    <span className="repeat-stat-val" style={{ color: "#64748b" }}>
                      {repeatCustomerStats.firstTimeCount} ({100 - repeatCustomerStats.rate}%)
                    </span>
                  </div>
                  <button 
                    className="repeat-details-btn"
                    onClick={() => setShowRepeatDetailsModal(true)}
                  >
                    Details <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>

              {/* Widget 2: Weekly Order Velocity */}
              <div className="ov-card velocity-card">
                <div className="card-header-clean">
                  <div>
                    <h3>Weekly Activity</h3>
                  </div>
                  <div className="velocity-header-tags">
                    <span className="peak-day-badge">
                      <Flame size={12} color="#f97316" /> Peak: Tue
                    </span>
                  </div>
                </div>

                <div className="velocity-chart-wrapper" onMouseLeave={() => setHoveredDay(null)}>
                  <svg viewBox="0 0 300 130" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                    <defs>
                      <linearGradient id="stdBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                      <linearGradient id="urgentBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                      <linearGradient id="peakGlowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                    </defs>

                    <line x1="10" y1="105" x2="290" y2="105" stroke="#f1f5f9" strokeWidth="1" />

                    {(() => {
                      const maxTotal = 20;
                      const colW = 20;
                      const spacing = (300 - (7 * colW)) / 8;

                      return weeklyVelocityData.map((item, i) => {
                        const x = spacing + i * (colW + spacing);
                        const totalH = (item.total / maxTotal) * 85;
                        const urgentH = (item.urgent / maxTotal) * 85;
                        const stdH = totalH - urgentH;

                        const yBase = 105;
                        const yStd = yBase - stdH;
                        const yUrgent = yStd - urgentH;

                        return (
                          <g 
                            key={item.day} 
                            id={`velocity-bar-${item.day.toLowerCase()}`}
                            data-testid={`velocity-bar-${item.day.toLowerCase()}`}
                            className="velocity-bar-group"
                            onMouseEnter={() => setHoveredDay(item)}
                          >
                            {/* Full-height hit area for smooth hover response */}
                            <rect
                              x={x - 6}
                              y="0"
                              width={colW + 12}
                              height="130"
                              fill="transparent"
                              style={{ cursor: "pointer" }}
                            />
                            {hoveredDay && hoveredDay.day === item.day && (
                              <rect
                                x={x - 4}
                                y={item.isPeak ? yUrgent - 24 : yUrgent - 6}
                                width={colW + 8}
                                height={yBase - (item.isPeak ? yUrgent - 24 : yUrgent - 6) + 4}
                                rx="8"
                                fill="rgba(59, 130, 246, 0.08)"
                              />
                            )}
                            <rect
                              x={x}
                              y={yStd}
                              width={colW}
                              height={stdH}
                              rx="5"
                              fill={item.isPeak ? "url(#peakGlowGrad)" : "url(#stdBarGrad)"}
                              className="velocity-bar-rect"
                            />
                            <rect
                              x={x}
                              y={yUrgent}
                              width={colW}
                              height={urgentH}
                              rx="5"
                              fill="url(#urgentBarGrad)"
                              className="velocity-bar-rect"
                            />

                            {item.isPeak && (
                              <g>
                                <rect
                                  x={x - 8}
                                  y={yUrgent - 20}
                                  width={colW + 16}
                                  height="16"
                                  rx="8"
                                  fill="#0f172a"
                                />
                                <text
                                  x={x + colW / 2}
                                  y={yUrgent - 8}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fontWeight="700"
                                  fill="#ffffff"
                                >
                                  {item.total}
                                </text>
                              </g>
                            )}

                            <text
                              x={x + colW / 2}
                              y="122"
                              textAnchor="middle"
                              fontSize="12"
                              fontWeight={item.isPeak ? "700" : "500"}
                              fill={item.isPeak ? "#2563eb" : "#64748b"}
                            >
                              {item.day}
                            </text>
                          </g>
                        );
                      });
                    })()}
                  </svg>

                  {hoveredDay && (
                    <div className="velocity-floating-tooltip">
                      <span className="vel-tip-day">{hoveredDay.day}</span>
                      <span className="vel-tip-sep">•</span>
                      <span className="vel-tip-total">{hoveredDay.total} orders</span>
                      <span className="vel-tip-divider">|</span>
                      <span className="vel-tip-stat std">
                        <span className="vel-tip-dot std"></span>
                        {hoveredDay.standard} Std
                      </span>
                      <span className="vel-tip-stat urg">
                        <span className="vel-tip-dot urg"></span>
                        {hoveredDay.urgent} Urg
                      </span>
                    </div>
                  )}
                </div>

                <div className="velocity-legend">
                  <div className="velocity-legend-items">
                    <span className="vel-legend-item">
                      <span className="vel-dot standard"></span> Standard
                    </span>
                    <span className="vel-legend-item">
                      <span className="vel-dot urgent"></span> Urgent
                    </span>
                  </div>
                  <span className="vel-meta-stat">
                    Avg: 3.2 Days
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Workforce Lifecycle (Onboarding & Offboarding) */}
          <div className="overview-bottom-row">
            {/* Onboarding Overview Card */}
            <div className="ov-card">
              <div className="card-header-clean">
                <div>
                  <h3>Onboarding</h3>
                </div>
                <span className="stage-trend-pill positive" style={{ fontSize: "11px" }}>
                  +12 this month
                </span>
              </div>

              <div className="lifecycle-card-body">
                <div className="donut-wrapper">
                  <svg viewBox="0 0 100 100" className="donut-svg">
                    <circle cx="50" cy="50" r="40" className="donut-ring-track" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="donut-segment"
                      stroke="#3b82f6"
                      strokeDasharray="138.2 251.3"
                      strokeDashoffset="0"
                      onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, onboarding: { label: "In Progress", val: "68" } }))}
                      onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, onboarding: null }))}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="donut-segment"
                      stroke="#10b981"
                      strokeDasharray="72.8 251.3"
                      strokeDashoffset="-138.2"
                      onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, onboarding: { label: "Verification", val: "36" } }))}
                      onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, onboarding: null }))}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="donut-segment"
                      stroke="#f59e0b"
                      strokeDasharray="40.3 251.3"
                      strokeDashoffset="-211"
                      onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, onboarding: { label: "Completed", val: "20" } }))}
                      onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, onboarding: null }))}
                    />
                  </svg>
                  <div className="donut-center-info">
                    <span className="donut-center-label">
                      {activeDonutHover.onboarding?.label || "Total"}
                    </span>
                    <span className="donut-center-val">
                      {activeDonutHover.onboarding?.val || "124"}
                    </span>
                  </div>
                </div>

                <div className="lifecycle-breakdown-list">
                  <div className="lifecycle-item">
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#3b82f6" }}></span>
                        Training
                      </span>
                      <span className="lifecycle-item-val">68 (55%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: "55%", background: "#3b82f6" }}></div>
                    </div>
                  </div>

                  <div className="lifecycle-item">
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#10b981" }}></span>
                        Verification
                      </span>
                      <span className="lifecycle-item-val">36 (29%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: "29%", background: "#10b981" }}></div>
                    </div>
                  </div>

                  <div className="lifecycle-item">
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#f59e0b" }}></span>
                        Completed
                      </span>
                      <span className="lifecycle-item-val">20 (16%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: "16%", background: "#f59e0b" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Offboarding Overview Card */}
            <div className="ov-card">
              <div className="card-header-clean">
                <div>
                  <h3>Offboarding</h3>
                </div>
                <span className="tile-trend-pill neutral" style={{ fontSize: "11px" }}>
                  45 Pipeline
                </span>
              </div>

              <div className="lifecycle-card-body">
                <div className="donut-wrapper">
                  <svg viewBox="0 0 100 100" className="donut-svg">
                    <circle cx="50" cy="50" r="40" className="donut-ring-track" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="donut-segment"
                      stroke="#f87171"
                      strokeDasharray="155.8 251.3"
                      strokeDashoffset="0"
                      onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, offboarding: { label: "Handover", val: "28" } }))}
                      onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, offboarding: null }))}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="donut-segment"
                      stroke="#8b78f6"
                      strokeDasharray="67.8 251.3"
                      strokeDashoffset="-155.8"
                      onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, offboarding: { label: "Clearance", val: "12" } }))}
                      onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, offboarding: null }))}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="donut-segment"
                      stroke="#64748b"
                      strokeDasharray="27.7 251.3"
                      strokeDashoffset="-223.6"
                      onMouseEnter={() => setActiveDonutHover(prev => ({ ...prev, offboarding: { label: "Deprovision", val: "5" } }))}
                      onMouseLeave={() => setActiveDonutHover(prev => ({ ...prev, offboarding: null }))}
                    />
                  </svg>
                  <div className="donut-center-info">
                    <span className="donut-center-label">
                      {activeDonutHover.offboarding?.label || "Total"}
                    </span>
                    <span className="donut-center-val">
                      {activeDonutHover.offboarding?.val || "45"}
                    </span>
                  </div>
                </div>

                <div className="lifecycle-breakdown-list">
                  <div className="lifecycle-item">
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#f87171" }}></span>
                        Handover
                      </span>
                      <span className="lifecycle-item-val">28 (62%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: "62%", background: "#f87171" }}></div>
                    </div>
                  </div>

                  <div className="lifecycle-item">
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#8b78f6" }}></span>
                        Clearance
                      </span>
                      <span className="lifecycle-item-val">12 (27%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: "27%", background: "#8b78f6" }}></div>
                    </div>
                  </div>

                  <div className="lifecycle-item">
                    <div className="lifecycle-item-top">
                      <span className="lifecycle-item-title">
                        <span className="lifecycle-dot" style={{ background: "#64748b" }}></span>
                        Deprovisioned
                      </span>
                      <span className="lifecycle-item-val">5 (11%)</span>
                    </div>
                    <div className="lifecycle-item-bar">
                      <div className="lifecycle-item-fill" style={{ width: "11%", background: "#64748b" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Repeat Customer Details Modal */}
          {showRepeatDetailsModal && (
            <div className="repeat-modal-backdrop" onClick={() => setShowRepeatDetailsModal(false)}>
              <div className="repeat-modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="repeat-modal-header">
                  <h2>Repeat Customer Analytics</h2>
                  <button className="clean-icon-btn" onClick={() => setShowRepeatDetailsModal(false)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="repeat-modal-body">
                  <div className="repeat-modal-metrics">
                    <div className="repeat-modal-metric-card">
                      <h4 style={{ color: "#059669" }}>{repeatCustomerStats.rate}%</h4>
                      <p>Repeat Rate</p>
                    </div>
                    <div className="repeat-modal-metric-card">
                      <h4>{repeatCustomerStats.repeatCount}</h4>
                      <p>Repeat Orders</p>
                    </div>
                    <div className="repeat-modal-metric-card">
                      <h4 style={{ color: "#2563eb" }}>{repeatCustomerStats.totalCount}</h4>
                      <p>Total Leads</p>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px 0", color: "#0f172a" }}>
                      Recent Repeat Customer Accounts
                    </h4>
                    <div className="repeat-leads-table-wrapper">
                      <table className="repeat-leads-table">
                        <thead>
                          <tr>
                            <th>Client / Account</th>
                            <th>Stage</th>
                            <th>Order Value</th>
                            <th>Repeat Order</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repeatCustomerStats.repeatLeads.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ textAlign: "center", color: "#64748b", padding: "24px 16px" }}>
                                No repeat orders logged yet. Mark &quot;Repeated Order: Yes&quot; in the Create Lead form to track repeat accounts here.
                              </td>
                            </tr>
                          ) : (
                            repeatCustomerStats.repeatLeads.slice(0, 5).map((lead, idx) => (
                              <tr key={idx}>
                                <td><strong>{lead.clientName || lead.companyName || lead.name || `Client #${idx + 1}`}</strong></td>
                                <td style={{ textTransform: "capitalize" }}>{lead.orderStage || "Sample"}</td>
                                <td>${lead.netAmount || lead.totalAmount || "1,200.00"}</td>
                                <td><span className="repeat-tag yes">Yes</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="repeat-modal-footer">
                  <button className="btn-secondary" onClick={() => setShowRepeatDetailsModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "case" && (
        <div className="dashboard-content">
          <OrderManagementDashboard />
        </div>
      )}

      {activeTab === "employee" && (
        <div className="dashboard-content">
          <div className="employee-cards-grid">
            {employees.map((emp) => (
              <div key={emp.id} className="employee-card">
                <div className="emp-card-header">
                  <div className="emp-avatar" style={{ backgroundColor: emp.avatarBg }}>
                    {emp.initials}
                    <span className={`emp-status ${emp.status}`}></span>
                  </div>
                  <h3 className="emp-name">{emp.name}</h3>
                  <p className="emp-role">{emp.role}</p>
                  <span className="emp-badge">{emp.department}</span>
                </div>
                <div className="emp-stats">
                  <div className="emp-stat">
                    <h4>{emp.openTasks}</h4>
                    <p>Open leads</p>
                  </div>
                  <div className="emp-stat">
                    <h4>{emp.completedTasks}</h4>
                    <p>Completed</p>
                  </div>
                </div>
                <div className="emp-workload">
                  <div className="workload-header">
                    <span>Workload</span>
                    <span>{emp.workload}%</span>
                  </div>
                  <div className="workload-bar-bg">
                    <div
                      className="workload-bar-fill"
                      style={{
                        width: `${emp.workload}%`,
                        backgroundColor: getWorkloadColor(emp.workload),
                      }}
                    ></div>
                  </div>
                </div>
                <div className="emp-actions">
                  <button className="btn-msg">Message</button>
                  <button className="btn-profile" onClick={() => setSelectedEmployee(emp)}>
                    Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side Panel Overlay */}
      {activeTab === "employee" && (
        <div
          className={`side-panel-overlay ${selectedEmployee ? "open" : ""}`}
          onClick={() => setSelectedEmployee(null)}
        ></div>
      )}

      {/* Side Panel */}
      {activeTab === "employee" && (
        <div className={`side-panel ${selectedEmployee ? "open" : ""}`}>
          {selectedEmployee && (
            <div className="side-panel-content">
              <button
                className="close-panel-btn"
                onClick={() => setSelectedEmployee(null)}
              >
                <X size={20} />
              </button>

              <div className="sp-header">
                <div
                  className="sp-avatar"
                  style={{ backgroundColor: selectedEmployee.avatarBg }}
                >
                  {selectedEmployee.initials}
                </div>
                <h2>{selectedEmployee.name}</h2>
                <p>{selectedEmployee.role}</p>

                <div className="sp-meta">
                  <span>
                    <MapPin size={14} /> Lisbon
                  </span>
                  <span>
                    <Users size={14} /> {selectedEmployee.department}
                  </span>
                  <span className="sp-online-status">
                    <span className={`sp-dot ${selectedEmployee.status}`}></span>
                    {selectedEmployee.status === "online" ? "Online" : "Away"}
                  </span>
                </div>
              </div>

              <div className="sp-stats-row">
                <div className="sp-stat-box">
                  <h3>{selectedEmployee.openTasks}</h3>
                  <p>Open</p>
                </div>
                <div className="sp-stat-box">
                  <h3>{selectedEmployee.completedTasks}</h3>
                  <p>Done</p>
                </div>
                <div className="sp-stat-box">
                  <h3>{selectedEmployee.workload}%</h3>
                  <p>Load</p>
                </div>
              </div>

              <div className="sp-tasks-section">
                <h4>Assigned tasks</h4>
                <div className="sp-task-list">
                  <div className="sp-task-item">
                    <span className="task-dot in-progress"></span>
                    <span className="task-name">Design login & sign-up screens</span>
                    <span className="task-status">In progress</span>
                  </div>
                  <div className="sp-task-item">
                    <span className="task-dot done"></span>
                    <span className="task-name">Monorepo cleanup</span>
                    <span className="task-status">Done</span>
                  </div>
                  <div className="sp-task-item">
                    <span className="task-dot done"></span>
                    <span className="task-name">Dashboard analytics widgets</span>
                    <span className="task-status">Done</span>
                  </div>
                </div>
              </div>

              <div className="sp-actions">
                <button className="btn-msg">Message</button>
                <button className="btn-assign">+ Assign task</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
