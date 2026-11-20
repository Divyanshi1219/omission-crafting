import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
  Loader2
} from "lucide-react";
import api from "../api";
import "./PendingPaymentsPage.css";

export default function PendingPaymentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialScope = searchParams.get("scope") === "all" || location.state?.scope === "all" ? "all" : "dtf";

  const [scope, setScope] = useState(initialScope); // "dtf" | "all"
  const [searchQuery, setSearchQuery] = useState("");

  const matchesOverviewEmployee = (lead, empName) => {
    if (!empName || empName === "all") return true;
    const target = empName.toLowerCase().trim();
    const itemEmp = (lead.employeeName || "").toLowerCase().trim();
    const itemAssigned = (lead.assignedTo || "").toLowerCase().trim();
    const itemCreatedBy = (lead.createdBy || "").toLowerCase().trim();
    const itemSales = (lead.salesPerson || lead.salesRep || "").toLowerCase().trim();
    return (
      (itemEmp && (itemEmp === target || itemEmp.includes(target) || target.includes(itemEmp))) ||
      (itemAssigned && (itemAssigned === target || itemAssigned.includes(target) || target.includes(itemAssigned))) ||
      (itemCreatedBy && (itemCreatedBy === target || itemCreatedBy.includes(target) || target.includes(itemCreatedBy))) ||
      (itemSales && (itemSales === target || itemSales.includes(target) || target.includes(itemSales)))
    );
  };

  const activeEmployee = location.state?.employee || (() => {
    try {
      const s = sessionStorage.getItem("selected_overview_employee");
      if (s && s !== "all") return s;
    } catch (_) {}
    return null;
  })();

  useEffect(() => {
    const s = searchParams.get("scope") || location.state?.scope;
    if (s === "all" || s === "dtf") {
      setScope(s);
    }
  }, [searchParams, location.state]);

  // Initialize leads with zero delay from router state or cached storage
  const [leads, setLeads] = useState(() => {
    if (location.state?.leads && Array.isArray(location.state.leads) && location.state.leads.length > 0) {
      return location.state.leads;
    }
    try {
      const cached = sessionStorage.getItem("omission_cached_leads");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return activeEmployee ? parsed.filter(l => matchesOverviewEmployee(l, activeEmployee)) : parsed;
        }
      }
    } catch (_) {}
    return [];
  });

  const [loading, setLoading] = useState(() => {
    if (location.state?.leads && Array.isArray(location.state.leads) && location.state.leads.length > 0) {
      return false;
    }
    try {
      const cached = sessionStorage.getItem("omission_cached_leads");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch (_) {}
    return true;
  });

  useEffect(() => {
    let isMounted = true;
    api.get("/api/leads")
      .then((res) => {
        if (!isMounted) return;
        const fetched = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        if (Array.isArray(fetched) && fetched.length > 0) {
          try {
            sessionStorage.setItem("omission_cached_leads", JSON.stringify(fetched));
          } catch (_) {}
          const filtered = activeEmployee ? fetched.filter(l => matchesOverviewEmployee(l, activeEmployee)) : fetched;
          setLeads(filtered);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch leads for pending payments:", err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeEmployee]);

  // Process and sort all pending payment orders
  const { dtfOrders, allOrders } = useMemo(() => {
    const now = new Date().getTime();
    const dtf = [];
    const all = [];

    leads.forEach((l) => {
      const stage = (l.orderStage || "").toLowerCase().trim();
      const sub = (l.subStage || "").toLowerCase().trim().replace(/_/g, "-");
      const netVal = Number(l.netAmount) || 0;
      const subTotal = Number(l.totalAmount) || 0;
      const tot = netVal > 0 ? netVal : subTotal;
      const adv = Number(l.customerApprovalData?.amountReceived) ||
        Number(l.customerApprovalData?.amountPaid) ||
        Number(l.advanceAmount) || 0;

      let pend;
      if (l.customerApprovalData?.paymentStatus === "fully_received" || l.partialPaymentConfirmationData?.paymentStatus === "fully_received" || l.isCompleted) {
        pend = 0;
      } else if (l.customerApprovalData?.balanceRemaining !== undefined && !isNaN(Number(l.customerApprovalData.balanceRemaining))) {
        pend = Number(l.customerApprovalData.balanceRemaining);
      } else if (l.pendingAmount !== undefined && !isNaN(Number(l.pendingAmount))) {
        pend = Number(l.pendingAmount);
      } else {
        pend = Math.max(0, tot - adv);
      }

      // Sanitize unrealistic test numbers
      if (isNaN(pend) || pend < 0 || (tot > 0 && pend > tot * 2) || pend > 50000000) {
        pend = tot > adv ? tot - adv : 0;
      }

      // Exclude Embroidery and Referred Back orders from DTF Partial pipeline
      const isEmb = (l.printingType || "").toLowerCase().trim() === "embroidery" ||
        (Array.isArray(l.items) && l.items.some((it) => String(it?.printingType || "").toLowerCase().trim() === "embroidery"));
      const isReferredBack = l.approvalStatus === "Referred Back";

      const isDtf = !isEmb && !isReferredBack && stage === "partial" && (sub.includes("payment") || sub === "payment-confirmation" || sub === "payment status");

      if (pend > 0 || isDtf) {
        const dateStr = l.updatedAt || l.createdAt || l.date;
        const orderDate = dateStr ? new Date(dateStr).getTime() : now;
        const daysPassed = Math.max(0, Math.floor((now - orderDate) / (1000 * 60 * 60 * 24)));

        const item = {
          id: l._id,
          orderId: l.orderId || l.orderNo || `ORD-${l._id?.slice(-4)}`,
          clientName: l.clientName || l.customerName || "Customer",
          companyName: l.companyName || "",
          orderStage: l.orderStage || "partial",
          subStage: l.subStage || "order",
          totalAmount: tot,
          subtotalAmount: subTotal,
          gst: Number(l.gst) || 0,
          advanceAmount: adv,
          pendingAmount: pend,
          daysPassed,
          isDtf
        };

        all.push(item);
        if (isDtf) {
          dtf.push(item);
        }
      }
    });

    dtf.sort((a, b) => b.daysPassed - a.daysPassed);
    all.sort((a, b) => b.daysPassed - a.daysPassed);

    return { dtfOrders: dtf, allOrders: all };
  }, [leads]);

  const activeOrders = scope === "dtf" ? dtfOrders : allOrders;

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return activeOrders.filter((ord) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        ord.orderId.toLowerCase().includes(q) ||
        ord.clientName.toLowerCase().includes(q) ||
        ord.companyName.toLowerCase().includes(q)
      );
    });
  }, [activeOrders, searchQuery]);

  const totalPendingSum = activeOrders.reduce((sum, o) => sum + o.pendingAmount, 0);

  return (
    <div className="pending-payments-page">
      {/* Cleaner Page Header */}
      <div className="pending-page-header">
        <div className="pending-page-header-left">
          <button
            type="button"
            className="pending-back-btn"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate("/");
              }
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <h1 className="pending-page-title">
            Pending Payments {activeEmployee && <span style={{ fontSize: "16px", fontWeight: "500", color: "#64748b", marginLeft: "8px" }}>• {activeEmployee}</span>}
          </h1>
        </div>

        <div className="pending-header-stats">
          <div className="pending-stat-pill">
            <span>Pending Amount:</span>
            <strong>
              {loading && leads.length === 0 ? "..." : `₹${Math.round(totalPendingSum).toLocaleString("en-IN")}`}
            </strong>
          </div>
          <div className="pending-stat-pill">
            <span>Orders:</span>
            <strong>{loading && leads.length === 0 ? "..." : activeOrders.length}</strong>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="pending-main-card">
        {/* Simple Toolbar */}
        <div className="pending-toolbar">
          <div className="pending-filters-group">
            {/* Scope Switcher */}
            <div className="pending-toggle-switch">
              <button
                type="button"
                className={`pending-switch-btn ${scope === "dtf" ? "active" : ""}`}
                onClick={() => setScope("dtf")}
              >
                DTF Partial ({dtfOrders.length})
              </button>
              <button
                type="button"
                className={`pending-switch-btn ${scope === "all" ? "active" : ""}`}
                onClick={() => setScope("all")}
              >
                All Orders ({allOrders.length})
              </button>
            </div>
          </div>

          <div className="pending-search-box">
            <Search size={15} className="pending-search-icon" />
            <input
              type="text"
              placeholder="Search order #, client, company..."
              className="pending-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Clean Orders Table */}
        <div className="pending-table-wrap">
          {loading && leads.length === 0 ? (
            <div className="pending-loading-state">
              <Loader2 size={32} className="pending-spinner-icon" />
              <p>Loading pending orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="pending-empty-state">
              <CheckCircle2 size={40} color="#10b981" style={{ margin: "0 auto 10px" }} />
              <p>No orders found matching this filter.</p>
            </div>
          ) : (
            <table className="pending-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Client &amp; Company</th>
                  <th>Stage</th>
                  <th>Total Value</th>
                  <th>Advance Paid</th>
                  <th>Pending Amount</th>
                  <th>Days Passed (Ageing)</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => {
                  const isOverdue = ord.daysPassed > 7;
                  const isWarning = ord.daysPassed >= 4 && ord.daysPassed <= 7;
                  const badgeClass = isOverdue ? "overdue" : isWarning ? "warning" : "recent";

                  return (
                    <tr
                      key={ord.id || ord.orderId}
                      className="pending-table-row clickable-row"
                      onClick={() => {
                        if (ord.isDtf || ord.orderStage === "partial") {
                          navigate(`/order/partial/payment-confirmation?id=${ord.id}`);
                        } else {
                          navigate(`/order/${ord.orderStage || 'sample'}/${ord.subStage || 'order'}?id=${ord.id}`);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                      title="Click to view and confirm payment"
                    >
                      <td>
                        <span className="pending-order-link">{ord.orderId}</span>
                      </td>
                      <td>
                        <div className="pending-client-name">{ord.clientName}</div>
                        {ord.companyName && (
                          <div className="pending-company-name">{ord.companyName}</div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                          {ord.isDtf ? "DTF Partial" : `${ord.orderStage} > ${ord.subStage}`}
                        </span>
                      </td>
                      <td className="pending-amount-text">
                        <div>₹{Math.round(ord.totalAmount).toLocaleString("en-IN")}</div>
                        {ord.gst > 0 && ord.subtotalAmount > 0 && ord.subtotalAmount !== ord.totalAmount && (
                          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 400 }}>
                            Base: ₹{Math.round(ord.subtotalAmount).toLocaleString("en-IN")} + {ord.gst}% GST
                          </div>
                        )}
                      </td>
                      <td className="pending-amount-text" style={{ color: "#059669" }}>
                        ₹{Math.round(ord.advanceAmount).toLocaleString("en-IN")}
                      </td>
                      <td className="pending-amount-bold">
                        ₹{Math.round(ord.pendingAmount).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span className={`pending-age-badge ${badgeClass}`}>
                          <Clock size={12} />
                          <span>{ord.daysPassed} {ord.daysPassed === 1 ? "day" : "days"} passed</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
