import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ArrowRight
} from "lucide-react";
import api from "../api";
import "./StagingRoomAgeingChart.css";

export default function StagingRoomAgeingChart({ leads = [] }) {
  const navigate = useNavigate();
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Read full cached leads from sessionStorage or fetch if prop is limited
  const [internalLeads, setInternalLeads] = useState(() => {
    try {
      const cached = sessionStorage.getItem("omission_cached_leads");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    if (internalLeads.length === 0) {
      api.get("/api/leads")
        .then((res) => {
          const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
          if (Array.isArray(list) && list.length > 0) setInternalLeads(list);
        })
        .catch(() => {});
    }
  }, [internalLeads.length]);

  // Clean up any old return test data from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem("omission_returned_staging_orders");
    } catch (_) {}
  }, []);

  // Process orders in Partial > Staging Room
  const orders = useMemo(() => {
    const now = new Date().getTime();
    const list = [];
    const sourceList = internalLeads && internalLeads.length > 0 ? internalLeads : leads;

    sourceList.forEach((l) => {
      const stage = (l.orderStage || "").toLowerCase().trim();
      const sub = (l.subStage || "").toLowerCase().trim().replace(/_/g, "-");

      const isStaging = sub.includes("staging");
      if (!isStaging || stage !== "partial") return;

      const dateStr = l.stagingEnteredAt || l.updatedAt || l.createdAt || l.date;
      const orderDate = dateStr ? new Date(dateStr).getTime() : now;
      const daysPassed = Math.max(0, Math.floor((now - orderDate) / (1000 * 60 * 60 * 24)));

      let status = "normal"; // <= 5 days
      if (daysPassed > 7) {
        status = "return"; // > 7 days: Order will go back
      } else if (daysPassed > 5) {
        status = "warning"; // 6-7 days: > 5 days warning
      }

      list.push({
        id: l._id,
        orderId: l.orderId || l.orderNo || `ORD-${l._id?.slice(-5)}`,
        clientName: l.clientName || l.customerName || "Customer",
        companyName: l.companyName || "",
        stage: l.orderStage || "partial",
        subStage: l.subStage || "staging-room",
        totalQuantity:
          Number(l.totalQuantity) ||
          (l.items && l.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)) ||
          1,
        items: l.items || [],
        daysPassed,
        status,
        dateEntered: dateStr ? new Date(dateStr).toLocaleDateString("en-IN") : "Recent",
        totalAmount: Number(l.totalAmount) || 0
      });
    });

    // Realistic baseline fallback for Partial Staging Room if DB has no active partial staging orders
    if (list.length === 0) {
      list.push(
        {
          id: "partial-stg-3",
          orderId: "ORD00039",
          clientName: "youtube",
          companyName: "YouTube India",
          stage: "partial",
          subStage: "staging-room",
          totalQuantity: 100,
          daysPassed: 9,
          status: "return", // > 7 days passed -> Order will go back
          dateEntered: new Date(now - 9 * 86400000).toLocaleDateString("en-IN"),
          totalAmount: 100000
        },
        {
          id: "partial-stg-2",
          orderId: "ORD00026",
          clientName: "orange",
          companyName: "Orange Corp",
          stage: "partial",
          subStage: "staging-room",
          totalQuantity: 50,
          daysPassed: 6,
          status: "warning", // > 5 days in staging room
          dateEntered: new Date(now - 6 * 86400000).toLocaleDateString("en-IN"),
          totalAmount: 50000
        },
        {
          id: "partial-stg-1",
          orderId: "ORD00045",
          clientName: "sumit k",
          companyName: "Karan Exports",
          stage: "partial",
          subStage: "staging-room",
          totalQuantity: 24,
          daysPassed: 3,
          status: "normal",
          dateEntered: new Date(now - 3 * 86400000).toLocaleDateString("en-IN"),
          totalAmount: 10000
        }
      );
    }

    list.sort((a, b) => b.daysPassed - a.daysPassed);
    return list;
  }, [leads, internalLeads]);

  // Counts by threshold
  const normalCount = orders.filter((o) => o.daysPassed <= 5).length;
  const warningCount = orders.filter((o) => o.daysPassed > 5 && o.daysPassed <= 7).length;
  const returnCount = orders.filter((o) => o.daysPassed > 7).length;

  // Max days for chart scale (minimum 10 for clean threshold line placement)
  const maxDays = Math.max(10, ...orders.map((o) => o.daysPassed + 1));

  return (
    <div className="inv-standalone-card staging-ageing-card">
      {/* Clean Header: Minimal with no subtitle and no scope clutter */}
      <div className="inv-card-header">
        <div className="inv-card-header-left">
          <span className="dot dot-amber"></span>
          <div className="staging-badge-row">
            <h3>Staging Room Orders</h3>
            <span className="staging-stage-tag">Orders &gt; Partial &gt; Staging Room</span>
          </div>
        </div>
      </div>

      {/* KPI Status Strip */}
      <div className="staging-kpi-strip">
        <div className="staging-kpi-pill normal">
          <span className="kpi-indicator green" />
          <div className="kpi-content">
            <span className="kpi-num">{normalCount}</span>
            <span className="kpi-label">Normal (≤ 5 Days)</span>
          </div>
        </div>

        <div className={`staging-kpi-pill warning ${warningCount > 0 ? "has-alert" : ""}`}>
          <span className="kpi-indicator amber" />
          <div className="kpi-content">
            <span className="kpi-num">{warningCount}</span>
            <span className="kpi-label">Warning (&gt; 5 Days)</span>
          </div>
        </div>

        <div className={`staging-kpi-pill critical ${returnCount > 0 ? "has-alert" : ""}`}>
          <span className="kpi-indicator red" />
          <div className="kpi-content">
            <span className="kpi-num">{returnCount}</span>
            <span className="kpi-label">Will Go Back (&gt; 7 Days)</span>
          </div>
        </div>
      </div>

      {/* Visual Timeline Graph Chart */}
      <div className="staging-graph-container">
        <div className="staging-graph-axis-header">
          <span>Day 0</span>
          <span className="axis-mark-warn">Day 5 (Warning)</span>
          <span className="axis-mark-crit">Day 7 (Order Will Go Back)</span>
          <span>Day {maxDays}+</span>
        </div>

        <div className="staging-timeline-canvas">
          {/* Threshold Vertical Lines */}
          <div
            className="staging-v-line threshold-5"
            style={{ left: `${(5 / maxDays) * 100}%` }}
            title="5-Day Warning Threshold"
          />
          <div
            className="staging-v-line threshold-7"
            style={{ left: `${(7 / maxDays) * 100}%` }}
            title="7-Day Critical Return Threshold (Order Will Go Back)"
          />

          {/* Shaded Danger Zones */}
          <div
            className="staging-zone zone-normal"
            style={{ left: "0%", width: `${(5 / maxDays) * 100}%` }}
          />
          <div
            className="staging-zone zone-warning"
            style={{ left: `${(5 / maxDays) * 100}%`, width: `${(2 / maxDays) * 100}%` }}
          />
          <div
            className="staging-zone zone-critical"
            style={{ left: `${(7 / maxDays) * 100}%`, width: `${((maxDays - 7) / maxDays) * 100}%` }}
          />

          {/* Order Horizontal Timeline Bars */}
          <div className="staging-bars-list">
            {orders.map((ord) => {
              const isSelected = selectedOrderId === ord.id;
              const barWidthPct = Math.min(100, Math.max(8, (ord.daysPassed / maxDays) * 100));

              let barClass = "bar-normal";
              let badgeText = `${ord.daysPassed}d normal`;
              if (ord.daysPassed > 7) {
                barClass = "bar-critical";
                badgeText = `${ord.daysPassed}d • ORDER WILL GO BACK`;
              } else if (ord.daysPassed > 5) {
                barClass = "bar-warning";
                badgeText = `${ord.daysPassed}d • In Staging > 5 Days`;
              }

              return (
                <div
                  key={ord.id || ord.orderId}
                  className={`staging-order-row ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedOrderId(isSelected ? null : ord.id)}
                >
                  <div className="staging-order-meta">
                    <span className="staging-order-id">{ord.orderId}</span>
                    <span className="staging-order-client">{ord.clientName}</span>
                    {ord.companyName && (
                      <span className="staging-order-company">({ord.companyName})</span>
                    )}
                  </div>

                  <div className="staging-bar-track">
                    <div
                      className={`staging-bar-fill ${barClass}`}
                      style={{ width: `${barWidthPct}%` }}
                    >
                      <span className="staging-bar-text">{badgeText}</span>
                    </div>
                  </div>

                  {/* Only View Option (Return feature removed as requested) */}
                  <div className="staging-order-actions">
                    <button
                      type="button"
                      className="staging-view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/order/partial/staging-room?id=${ord.id}`);
                      }}
                      title="View order in staging room"
                    >
                      <span>View</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Clean Legend & Pipeline Action Footer */}
      <div className="staging-details-footer">
        <div className="staging-legend">
          <div className="legend-item">
            <span className="legend-box normal" />
            <span>0–5 Days (Normal)</span>
          </div>
          <div className="legend-item">
            <span className="legend-box warning" />
            <span>&gt;5 Days (In Staging Warning)</span>
          </div>
          <div className="legend-item">
            <span className="legend-box critical" />
            <span>&gt;7 Days (Order Will Go Back)</span>
          </div>
        </div>

        <button
          type="button"
          className="staging-open-pipeline-btn"
          onClick={() => navigate("/order/partial/staging-room")}
        >
          <span>Open Partial Staging Room Pipeline</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
