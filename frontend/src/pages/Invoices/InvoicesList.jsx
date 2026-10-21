import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  FileText,
  Download,
  Printer,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Receipt,
  Eye,
  AlertCircle
} from "lucide-react";
import api from "../../api";
import "./InvoicesList.css";

const STORAGE_KEY = "omission_local_invoices";

function InvoicesList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'Paid' | 'Sent' | 'Draft'
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Fetch invoices from backend with localStorage fallback
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/invoices");
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setInvoices(res.data.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data.data));
      } else {
        throw new Error("Invalid response");
      }
    } catch (err) {
      console.warn("Could not fetch invoices from backend, loading local cache:", err.message);
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          setInvoices(JSON.parse(cached));
        } else {
          setInvoices([]);
        }
      } catch (_) {
        setInvoices([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/api/invoices/${id}`);
    } catch (err) {
      console.warn("Could not delete from backend, deleting from local cache:", err.message);
    }
    const updated = invoices.filter((inv) => (inv._id || inv.id) !== id);
    setInvoices(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setDeleteConfirmId(null);
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (inv.invoiceNumber || "").toLowerCase().includes(q) ||
      (inv.customerName || "").toLowerCase().includes(q) ||
      (inv.invoiceDate || "").toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const totalCount = invoices.length;
  const totalAmount = invoices.reduce(
    (sum, inv) => sum + (Number(inv.grandTotal) || 0),
    0
  );
  const paidCount = invoices.filter((i) => i.status === "Paid").length;
  const pendingCount = invoices.filter((i) => i.status === "Sent" || i.status === "Draft").length;

  return (
    <div className="invoices-page-container">
      {/* Top Header */}
      <div className="invoices-header">
        <div>
          <div className="invoices-breadcrumb">
            <span>Sales Operations</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-active">Invoices</span>
          </div>
          <h1 className="invoices-title">Commercial Invoices</h1>
          <p className="invoices-subtitle">
            Create, manage and issue GST-compliant invoices for your clients.
          </p>
        </div>

        <button
          className="create-invoice-btn"
          onClick={() => navigate("/invoices/create")}
          id="btn-create-invoice"
        >
          <Plus size={16} />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Metric Tiles */}
      <div className="invoices-metrics-grid">
        <div className="inv-metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Invoices</span>
            <div className="metric-icon-wrap blue">
              <FileText size={18} />
            </div>
          </div>
          <div className="metric-value">{totalCount}</div>
          <div className="metric-subtext">Issued commercial bills</div>
        </div>

        <div className="inv-metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Revenue Invoiced</span>
            <div className="metric-icon-wrap green">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value">
            ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-subtext">Cumulative billed amount</div>
        </div>

        <div className="inv-metric-card">
          <div className="metric-header">
            <span className="metric-title">Paid Invoices</span>
            <div className="metric-icon-wrap emerald">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="metric-value">{paidCount}</div>
          <div className="metric-subtext">Settled & cleared transactions</div>
        </div>

        <div className="inv-metric-card">
          <div className="metric-header">
            <span className="metric-title">Awaiting Payment</span>
            <div className="metric-icon-wrap amber">
              <Clock size={18} />
            </div>
          </div>
          <div className="metric-value">{pendingCount}</div>
          <div className="metric-subtext">Open & pending settlement</div>
        </div>
      </div>

      {/* Controls & Table Container */}
      <div className="invoices-card-table-wrap">
        <div className="invoices-table-controls">
          <div className="invoices-search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by invoice number, customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="invoices-filter-pills">
            {["all", "Sent", "Paid", "Draft"].map((st) => (
              <button
                key={st}
                className={`inv-filter-pill ${statusFilter === st ? "active" : ""}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === "all" ? "All Invoices" : st}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table or Empty State */}
        {loading ? (
          <div className="invoices-loading-box">
            <div className="inv-spinner"></div>
            <span>Loading invoices...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="invoices-empty-state">
            <div className="empty-state-icon">
              <Receipt size={42} />
            </div>
            <h3>No Invoices Found</h3>
            <p>
              {searchTerm || statusFilter !== "all"
                ? "No invoices match your search filters."
                : "You haven't generated any invoices yet. Click below to create your first client invoice."}
            </p>
            <button
              className="create-invoice-btn primary"
              onClick={() => navigate("/invoices/create")}
            >
              <Plus size={16} />
              <span>Create First Invoice</span>
            </button>
          </div>
        ) : (
          <div className="invoices-table-scroll">
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Client / Customer</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const id = inv._id || inv.id;
                  const count = inv.items?.length || 0;
                  const currSymbol = inv.currency === "USD" ? "$" : inv.currency === "EUR" ? "€" : "₹";
                  return (
                    <tr
                      key={id}
                      className="inv-row"
                      onClick={() => navigate(`/invoices/create?id=${id}`)}
                    >
                      <td>
                        <span className="inv-num-pill">{inv.invoiceNumber}</span>
                      </td>
                      <td>{inv.invoiceDate || "-"}</td>
                      <td>{inv.dueDate || "-"}</td>
                      <td>
                        <div className="client-cell">
                          <div
                            className="client-cell-dot"
                            style={{ backgroundColor: inv.themeColor || "#be185d" }}
                          ></div>
                          <span className="client-name">{inv.customerName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="items-count-badge">
                          {count} {count === 1 ? "item" : "items"}
                        </span>
                      </td>
                      <td>
                        <span className="amount-strong">
                          {currSymbol}
                          {Number(inv.grandTotal || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      <td>
                        <span className={`inv-status-tag ${inv.status?.toLowerCase() || "sent"}`}>
                          {inv.status || "Sent"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div className="inv-actions-cell">
                          <button
                            className="action-icon-btn"
                            title="View / Edit Invoice"
                            onClick={() => navigate(`/invoices/create?id=${id}`)}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="action-icon-btn delete"
                            title="Delete Invoice"
                            onClick={() => setDeleteConfirmId(id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Inline Delete Confirmation */}
                        {deleteConfirmId === id && (
                          <div className="inline-confirm-popup">
                            <span>Delete this invoice?</span>
                            <button
                              className="confirm-yes"
                              onClick={(e) => handleDelete(id, e)}
                            >
                              Yes
                            </button>
                            <button
                              className="confirm-no"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default InvoicesList;
