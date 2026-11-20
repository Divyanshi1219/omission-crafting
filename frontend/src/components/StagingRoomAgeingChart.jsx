import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import api from "../api";
import "./StagingRoomAgeingChart.css";

export default function StagingRoomAgeingChart({ leads = [] }) {
  const navigate = useNavigate();
  const [internalLeads, setInternalLeads] = useState([]);

  // Fetch real leads directly from backend on mount
  useEffect(() => {
    api.get("/api/leads")
      .then((res) => {
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        if (Array.isArray(list) && list.length > 0) {
          setInternalLeads(list);
          try {
            sessionStorage.setItem("omission_cached_leads", JSON.stringify(list));
          } catch (_) {}
        }
      })
      .catch((err) => console.warn("Could not load leads for staging cards:", err.message));
  }, []);

  // Use rich prop leads if provided and not stripped; otherwise use fresh internal leads
  const sourceList = useMemo(() => {
    if (
      Array.isArray(leads) &&
      leads.length > 0 &&
      (leads[0].subStage !== undefined || leads[0].stockTaskStage !== undefined || leads[0].createdAt !== undefined)
    ) {
      return leads;
    }
    if (internalLeads.length > 0) return internalLeads;
    try {
      const cached = sessionStorage.getItem("omission_cached_leads");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return Array.isArray(leads) ? leads : [];
  }, [leads, internalLeads]);

  // Process real active staging room orders from database
  const orders = useMemo(() => {
    const now = new Date().getTime();
    const list = [];

    sourceList.forEach((l) => {
      const stage = (l.orderStage || "").toLowerCase().trim();
      const sub = (l.subStage || "").toLowerCase().trim().replace(/_/g, "-");
      const stockStage = (l.stockTaskStage || "").toLowerCase().trim().replace(/_/g, "-");

      // Exclude orders that have finished/delivered/completed
      if (l.isCompleted || stage === "complete" || sub === "delivered" || sub === "customer-support") {
        return;
      }

      // Check if order is currently active in staging room
      const isStaging =
        sub.includes("staging") ||
        stockStage.includes("staging") ||
        stage.includes("staging") ||
        (stage === "partial" && Boolean(l.partialStagingRoomData?.stagedRackNumber));

      if (!isStaging) return;

      const dStr = l.stagingEnteredAt || l.updatedAt || l.createdAt || l.date;
      const orderDate = dStr ? new Date(dStr).getTime() : now;
      const daysPassed = Math.max(0, Math.floor((now - orderDate) / (1000 * 60 * 60 * 24)));

      let status = "normal"; // <= 5 days
      if (daysPassed > 7) {
        status = "return"; // > 7 days: Order requires rerack
      } else if (daysPassed > 5) {
        status = "warning"; // 6-7 days: > 5 days warning
      }

      const totalQty =
        Number(l.totalQuantity) ||
        (Array.isArray(l.items) && l.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)) ||
        1;

      list.push({
        id: l._id,
        orderId: l.orderId || l.orderNo || `ORD-${String(l._id).slice(-5)}`,
        clientName: l.clientName || l.customerName || "Customer",
        companyName: l.companyName || "",
        phoneNumber: l.phoneNumber || "",
        totalQuantity: totalQty,
        totalAmount: Number(l.totalAmount) || 0,
        rack: l.partialStagingRoomData?.stagedRackNumber || l.sampleStagingGroundData?.rackNumber || l.stagingRackNumber || "—",
        daysPassed,
        status,
        stage: l.orderStage || "sample",
        subStage: l.subStage || "staging-room",
      });
    });

    return list;
  }, [sourceList]);

  // Real Counts from Database
  const passed7DaysCount = useMemo(() => orders.filter((o) => o.status === "return").length, [orders]);
  const warningCount = useMemo(() => orders.filter((o) => o.status === "warning").length, [orders]);
  const normalCount = useMemo(() => orders.filter((o) => o.status === "normal").length, [orders]);

  // Navigate to dedicated separate page
  const handleGoToTable = (statusFilter = "") => {
    const fromPath = encodeURIComponent(window.location.pathname + window.location.search);
    if (statusFilter && statusFilter !== "all") {
      navigate(`/order/partial/staging-room?status=${statusFilter}&from=${fromPath}`);
    } else {
      navigate(`/order/partial/staging-room?from=${fromPath}`);
    }
  };

  return (
    <div className="staging-separate-cards-container">
      {/* 3 Separate Minimal Standalone Cards */}
      <div className="staging-cards-grid">
        {/* Card 1: Rerack (> 7 Days) */}
        <div
          className="staging-stat-card critical"
          onClick={() => handleGoToTable("return")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleGoToTable("return");
            }
          }}
          title="Click to view orders requiring rerack (> 7 days) in separate Staging Room table page"
        >
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="status-dot red" />
              <span className="card-title">Rerack</span>
              <span className="card-badge-threshold">&gt; 7 Days</span>
            </div>
            {passed7DaysCount > 0 ? (
              <span className="card-status-badge critical">Action Required</span>
            ) : (
              <span className="card-status-badge clear">Clear</span>
            )}
          </div>

          <div className="card-body">
            <div className="card-count red">{passed7DaysCount}</div>
            <div className="card-subtext">Orders passed 7 days staging limit</div>
          </div>

          <div className="card-footer">
            <span className="card-action-link">
              <span>View in Table</span>
              <ArrowRight size={13} className="action-arrow" />
            </span>
          </div>
        </div>

        {/* Card 2: Warning (> 5 Days) */}
        <div
          className="staging-stat-card warning"
          onClick={() => handleGoToTable("warning")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleGoToTable("warning");
            }
          }}
          title="Click to view warning orders in separate Staging Room table page"
        >
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="status-dot amber" />
              <span className="card-title">Warning</span>
              <span className="card-badge-threshold">&gt; 5 Days</span>
            </div>
            <span className="card-status-badge warning">In Staging</span>
          </div>

          <div className="card-body">
            <div className="card-count amber">{warningCount}</div>
            <div className="card-subtext">Approaching 7-day return limit</div>
          </div>

          <div className="card-footer">
            <span className="card-action-link">
              <span>View in Table</span>
              <ArrowRight size={13} className="action-arrow" />
            </span>
          </div>
        </div>

        {/* Card 3: Normal (≤ 5 Days) */}
        <div
          className="staging-stat-card normal"
          onClick={() => handleGoToTable("normal")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleGoToTable("normal");
            }
          }}
          title="Click to view normal staging orders in separate table page"
        >
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="status-dot green" />
              <span className="card-title">Normal</span>
              <span className="card-badge-threshold">≤ 5 Days</span>
            </div>
            <span className="card-status-badge normal">On Track</span>
          </div>

          <div className="card-body">
            <div className="card-count green">{normalCount}</div>
            <div className="card-subtext">Within standard staging SLA</div>
          </div>

          <div className="card-footer">
            <span className="card-action-link">
              <span>View in Table</span>
              <ArrowRight size={13} className="action-arrow" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
