import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  ChevronRight
} from "lucide-react";
import "./PaymentStatusWidget.css";

export default function PaymentStatusWidget({ leads = [] }) {
  const navigate = useNavigate();
  const [filterMode, setFilterMode] = useState("dtf-partial"); // "dtf-partial" | "all-pending" | "fully-paid" | "all"
  const [searchQuery, setSearchQuery] = useState("");

  // Process all payment records
  const stats = useMemo(() => {
    let totalOrderValue = 0;
    let totalAdvanceCollected = 0;
    let totalPendingAmount = 0;

    const dtfPartialList = [];
    const allPendingList = [];
    const fullyPaidList = [];
    const allValidList = [];

    leads.forEach((l) => {
      const stage = (l.orderStage || "").toLowerCase().trim();
      const sub = (l.subStage || "").toLowerCase().trim().replace(/_/g, "-");
      const netVal = Number(l.netAmount) || 0;
      const subTotal = Number(l.totalAmount) || 0;
      const total = netVal > 0 ? netVal : subTotal;
      const advance = Number(l.customerApprovalData?.amountReceived) ||
        Number(l.customerApprovalData?.amountPaid) ||
        Number(l.advanceAmount) || 0;
      
      let pending;
      if (l.customerApprovalData?.paymentStatus === "fully_received" || l.partialPaymentConfirmationData?.paymentStatus === "fully_received" || l.isCompleted) {
        pending = 0;
      } else if (l.customerApprovalData?.balanceRemaining !== undefined && !isNaN(Number(l.customerApprovalData.balanceRemaining))) {
        pending = Number(l.customerApprovalData.balanceRemaining);
      } else if (l.pendingAmount !== undefined && !isNaN(Number(l.pendingAmount))) {
        pending = Number(l.pendingAmount);
      } else {
        pending = Math.max(0, total - advance);
      }
      
      // Sanitize unrealistic spam test values or missing pending
      if (isNaN(pending) || pending < 0 || (total > 0 && pending > total * 2) || pending > 50000000) {
        if (total > advance) {
          pending = total - advance;
        } else {
          pending = 0;
        }
      }

      const item = {
        _id: l._id,
        orderId: l.orderId || l.orderNo || `ORD-${l._id?.slice(-5) || "000"}`,
        clientName: l.clientName || l.customerName || "Customer",
        companyName: l.companyName || l.clientName || "Company",
        orderStage: l.orderStage || "sample",
        subStage: l.subStage || "order",
        totalAmount: total,
        subtotalAmount: subTotal,
        gst: Number(l.gst) || 0,
        advanceAmount: advance,
        pendingAmount: pending,
        isDtfPartial: stage === "partial" && (sub.includes("payment") || sub === "payment-confirmation" || sub === "payment status"),
        isPending: pending > 0,
        isFullyPaid: total > 0 && pending <= 0
      };

      if (total > 0 || l.query === "order" || l.orderId) {
        allValidList.push(item);
        totalOrderValue += total;
        totalAdvanceCollected += advance;
        totalPendingAmount += pending;

        if (item.isDtfPartial) {
          dtfPartialList.push(item);
        }
        if (item.isPending) {
          allPendingList.push(item);
        }
        if (item.isFullyPaid) {
          fullyPaidList.push(item);
        }
      }
    });

    // Also include any partial leads in payment confirmation even if totalAmount is 0 in test data
    leads.forEach((l) => {
      const stage = (l.orderStage || "").toLowerCase().trim();
      const sub = (l.subStage || "").toLowerCase().trim().replace(/_/g, "-");
      if (stage === "partial" && (sub.includes("payment") || sub === "payment-confirmation" || sub === "payment status")) {
        if (!dtfPartialList.some((x) => x._id === l._id)) {
          const netVal = Number(l.netAmount) || 0;
          const subTotal = Number(l.totalAmount) || 0;
          const total = netVal > 0 ? netVal : subTotal;
          const advance = Number(l.customerApprovalData?.amountReceived) ||
            Number(l.customerApprovalData?.amountPaid) ||
            Number(l.advanceAmount) || 0;
          let pending = l.customerApprovalData?.balanceRemaining !== undefined
            ? Number(l.customerApprovalData.balanceRemaining)
            : (Number(l.pendingAmount) || 0);

          dtfPartialList.push({
            _id: l._id,
            orderId: l.orderId || l.orderNo || `ORD-${l._id?.slice(-5)}`,
            clientName: l.clientName || "Customer",
            companyName: l.companyName || "Company",
            orderStage: "partial",
            subStage: "payment-confirmation",
            totalAmount: total,
            subtotalAmount: subTotal,
            gst: Number(l.gst) || 0,
            advanceAmount: advance,
            pendingAmount: pending,
            isDtfPartial: true,
            isPending: pending > 0,
            isFullyPaid: pending <= 0
          });
        }
      }
    });

    const dtfPartialPendingAmount = dtfPartialList.reduce((sum, item) => sum + item.pendingAmount, 0);
    const realizationRate = totalOrderValue > 0 ? Math.round((totalAdvanceCollected / totalOrderValue) * 100) : 0;

    return {
      totalOrderValue,
      totalAdvanceCollected,
      totalPendingAmount,
      dtfPartialList,
      dtfPartialCount: dtfPartialList.length,
      dtfPartialPendingAmount,
      allPendingList,
      allPendingCount: allPendingList.length,
      fullyPaidList,
      fullyPaidCount: fullyPaidList.length,
      allValidList,
      realizationRate
    };
  }, [leads]);

  // Current list based on active tab
  const displayList = useMemo(() => {
    let base = [];
    if (filterMode === "dtf-partial") base = stats.dtfPartialList;
    else if (filterMode === "all-pending") base = stats.allPendingList;
    else if (filterMode === "fully-paid") base = stats.fullyPaidList;
    else base = stats.allValidList;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return base;
    return base.filter(
      (item) =>
        item.orderId.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q)
    );
  }, [filterMode, stats, searchQuery]);

  const handleOpenPaymentConfirmation = (orderId) => {
    if (orderId) {
      navigate(`/order/partial/payment-confirmation?id=${orderId}`);
    } else {
      navigate("/order/partial/payment-confirmation");
    }
  };

  return (
    <div className="payment-widget-card" id="payment-status-widget">
      {/* Widget Header */}
      <div className="payment-widget-header">
        <div className="payment-widget-title-group">
          <div className="payment-widget-icon-badge">
            <CreditCard size={22} />
          </div>
          <div>
            <h3 className="payment-widget-title">Payment Status & Pending Collections</h3>
            <div className="payment-widget-source-pill">
              <span className="source-dot" />
              <span>Source: DTF &gt; Partial &gt; Payment Confirmation</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="payment-widget-open-link"
          onClick={() => handleOpenPaymentConfirmation()}
          title="Open DTF Partial Payment Confirmation sub-stage"
        >
          <span>Open Payment Confirmation</span>
          <ExternalLink size={14} />
        </button>
      </div>

      {/* 4 Summary KPI Tiles */}
      <div className="payment-kpi-grid">
        {/* KPI 1: Highlight DTF Partial Payment Confirmation (Directly from Photo) */}
        <div 
          className="payment-kpi-tile highlight"
          style={{ cursor: "pointer" }}
          onClick={() => setFilterMode("dtf-partial")}
          title="Click to view orders at DTF > Partial > Payment Confirmation"
        >
          <div className="payment-kpi-tile-top">
            <span className="payment-kpi-label">DTF Partial Pending</span>
            <span className="payment-kpi-badge amber">From Photo</span>
          </div>
          <div className="payment-kpi-number-row">
            <span className="payment-kpi-count">{stats.dtfPartialCount}</span>
            <span className="payment-kpi-amount">
              ₹{Math.round(stats.dtfPartialPendingAmount).toLocaleString("en-IN")}
            </span>
          </div>
          <span className="payment-kpi-subtext">Awaiting payment clearance</span>
        </div>

        {/* KPI 2: Total Pending Across All Orders */}
        <div 
          className="payment-kpi-tile"
          style={{ cursor: "pointer" }}
          onClick={() => setFilterMode("all-pending")}
          title="Click to view all orders with pending payments"
        >
          <div className="payment-kpi-tile-top">
            <span className="payment-kpi-label">All Pending Orders</span>
            <span className="payment-kpi-badge amber">{stats.allPendingCount} Orders</span>
          </div>
          <div className="payment-kpi-number-row">
            <span className="payment-kpi-count">{stats.allPendingCount}</span>
            <span className="payment-kpi-amount">
              ₹{Math.round(stats.totalPendingAmount).toLocaleString("en-IN")}
            </span>
          </div>
          <span className="payment-kpi-subtext">Total receivables pending</span>
        </div>

        {/* KPI 3: Total Advance Collected */}
        <div 
          className="payment-kpi-tile"
          style={{ cursor: "pointer" }}
          onClick={() => setFilterMode("all")}
        >
          <div className="payment-kpi-tile-top">
            <span className="payment-kpi-label">Advance Collected</span>
            <span className="payment-kpi-badge green">Deposited</span>
          </div>
          <div className="payment-kpi-number-row">
            <span className="payment-kpi-count">₹{Math.round(stats.totalAdvanceCollected).toLocaleString("en-IN")}</span>
          </div>
          <span className="payment-kpi-subtext">Across active pipeline</span>
        </div>

        {/* KPI 4: Total Order Value & Realization */}
        <div 
          className="payment-kpi-tile"
          style={{ cursor: "pointer" }}
          onClick={() => setFilterMode("fully-paid")}
        >
          <div className="payment-kpi-tile-top">
            <span className="payment-kpi-label">Collection Rate</span>
            <span className="payment-kpi-badge blue">{stats.realizationRate}%</span>
          </div>
          <div className="payment-kpi-number-row">
            <span className="payment-kpi-count">₹{Math.round(stats.totalOrderValue).toLocaleString("en-IN")}</span>
          </div>
          <span className="payment-kpi-subtext">{stats.fullyPaidCount} fully cleared orders</span>
        </div>
      </div>

      {/* Collection Realization Progress Bar */}
      <div className="payment-progress-container">
        <div className="payment-progress-header">
          <span>Overall Collection Progress</span>
          <span>
            {stats.realizationRate}% Collected (₹{Math.round(stats.totalAdvanceCollected).toLocaleString("en-IN")} / ₹{Math.round(stats.totalOrderValue).toLocaleString("en-IN")})
          </span>
        </div>
        <div className="payment-stacked-bar">
          <div
            className="payment-bar-seg-advance"
            style={{ width: `${Math.min(stats.realizationRate, 100)}%` }}
            title={`Collected: ₹${Math.round(stats.totalAdvanceCollected).toLocaleString("en-IN")}`}
          />
          <div
            className="payment-bar-seg-pending"
            style={{ width: `${Math.max(0, 100 - stats.realizationRate)}%` }}
            title={`Pending: ₹${Math.round(stats.totalPendingAmount).toLocaleString("en-IN")}`}
          />
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="payment-toolbar">
        <div className="payment-filter-tabs">
          <button
            type="button"
            className={`payment-tab-btn ${filterMode === "dtf-partial" ? "active" : ""}`}
            onClick={() => setFilterMode("dtf-partial")}
          >
            <span>DTF Partial (Photo)</span>
            <span className="payment-pill-count">{stats.dtfPartialCount}</span>
          </button>
          <button
            type="button"
            className={`payment-tab-btn ${filterMode === "all-pending" ? "active" : ""}`}
            onClick={() => setFilterMode("all-pending")}
          >
            <span>All Pending Payments</span>
            <span className="payment-pill-count">{stats.allPendingCount}</span>
          </button>
          <button
            type="button"
            className={`payment-tab-btn ${filterMode === "fully-paid" ? "active" : ""}`}
            onClick={() => setFilterMode("fully-paid")}
          >
            <span>Fully Paid</span>
            <span className="payment-pill-count">{stats.fullyPaidCount}</span>
          </button>
          <button
            type="button"
            className={`payment-tab-btn ${filterMode === "all" ? "active" : ""}`}
            onClick={() => setFilterMode("all")}
          >
            <span>All Orders</span>
          </button>
        </div>

        <div className="payment-search-box">
          <Search size={15} className="payment-search-icon" />
          <input
            type="text"
            placeholder="Search order #, client, company..."
            className="payment-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="payment-table-wrap">
        {displayList.length === 0 ? (
          <div className="payment-empty-state">
            <CheckCircle2 size={36} color="#10b981" style={{ margin: "0 auto 8px" }} />
            <p>No orders found matching the selected payment filter.</p>
          </div>
        ) : (
          <table className="payment-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Client / Company</th>
                <th>Pipeline Stage</th>
                <th>Total Value</th>
                <th>Advance Paid</th>
                <th>Pending Amount</th>
              </tr>
            </thead>
            <tbody>
              {displayList.slice(0, 10).map((item) => (
                <tr
                  key={item._id || item.orderId}
                  onClick={() => handleOpenPaymentConfirmation(item._id)}
                  style={{ cursor: "pointer" }}
                  className="clickable-payment-row"
                  title="Click to view & confirm payment"
                >
                  <td>
                    <span className="payment-order-id">{item.orderId}</span>
                  </td>
                  <td>
                    <div className="payment-client-cell">
                      <span className="payment-client-name">{item.clientName}</span>
                      <span className="payment-client-company">{item.companyName}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`payment-stage-badge ${
                        item.isDtfPartial ? "highlight-photo" : ""
                      }`}
                    >
                      {item.isDtfPartial ? (
                        <>
                          <Clock size={12} />
                          <span>DTF Partial: Payment Confirm</span>
                        </>
                      ) : (
                        <span>
                          {item.orderStage.toUpperCase()} &gt; {item.subStage}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="payment-amount-cell">
                    <div>₹{Math.round(item.totalAmount).toLocaleString("en-IN")}</div>
                    {item.gst > 0 && item.subtotalAmount > 0 && item.subtotalAmount !== item.totalAmount && (
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 400 }}>
                        Base: ₹{Math.round(item.subtotalAmount).toLocaleString("en-IN")} + {item.gst}% GST
                      </div>
                    )}
                  </td>
                  <td className="payment-amount-cell" style={{ color: "#059669" }}>
                    ₹{Math.round(item.advanceAmount).toLocaleString("en-IN")}
                  </td>
                  <td className="payment-pending-cell">
                    ₹{Math.round(item.pendingAmount).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
