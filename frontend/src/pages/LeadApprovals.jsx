import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle,
  RotateCcw,
  Search,
  Clock,
  Eye,
  AlertCircle,
  X,
  User,
  Building,
  Phone,
  Calendar,
  Sparkles,
  ChevronRight,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import './LeadApprovals.css';

// Helper to normalize stage and subStage from database records (matches Dashboard)
const normalizeRecord = (lead) => {
  let stage = (lead.orderStage || 'sample').toLowerCase().trim();
  if (!['sample', 'partial', 'complete'].includes(stage)) {
    stage = 'sample';
  }
  let sub = (lead.subStage || 'order').toLowerCase().trim().replace(/_/g, '-').replace(/\s+/g, '-');
  if (sub === 'new' || sub === 'leads' || !sub) {
    sub = 'order';
  }
  const totalQty = Array.isArray(lead.items) && lead.items.length > 0
    ? lead.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
    : lead.totalQuantity || 0;

  return {
    ...lead,
    normStage: stage,
    normSub: sub,
    normalizedQty: totalQty
  };
};

export default function LeadApprovals() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Modal states
  const [referBackModal, setReferBackModal] = useState({
    isOpen: false,
    order: null,
    note: '',
    error: '',
    submitting: false,
  });

  const [approveModal, setApproveModal] = useState({
    isOpen: false,
    order: null,
    note: '',
    submitting: false,
  });

  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/leads');
      if (res.data?.data) {
        // Matches exact orders filter & normalization as Dashboard Recent Orders
        const list = res.data.data
          .filter(item => item.query === 'order' || item.orderStage || item.totalQuantity || item.orderId)
          .map(normalizeRecord)
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setOrders(list);
      }
    } catch (err) {
      console.error('Error fetching leads for approval:', err);
      showToast('Failed to load orders for approval.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Status helper
  const getApprovalStatus = (order) => {
    if (!order) return 'Pending';
    return order.leadApproval?.status || order.approvalStatus || 'Pending';
  };

  // Filtered orders list (full list view)
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Stage filter
      if (stageFilter !== 'all') {
        const orderStage = (order.normStage || order.orderStage || 'sample').toLowerCase();
        if (orderStage !== stageFilter.toLowerCase()) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const orderId = (order.orderId || '').toLowerCase();
        const taskId = (order.taskId || '').toLowerCase();
        const empName = (order.employeeName || '').toLowerCase();
        const compName = (order.companyName || '').toLowerCase();
        const clientName = (order.clientName || '').toLowerCase();
        const phone = (order.phoneNumber || '').toLowerCase();
        const logo = (order.logoName || '').toLowerCase();
        const itemsMatch = Array.isArray(order.items) && order.items.some(it =>
          (it.item || '').toLowerCase().includes(term) ||
          (it.fabric || '').toLowerCase().includes(term) ||
          (it.color || '').toLowerCase().includes(term)
        );

        return (
          orderId.includes(term) ||
          taskId.includes(term) ||
          empName.includes(term) ||
          compName.includes(term) ||
          clientName.includes(term) ||
          phone.includes(term) ||
          logo.includes(term) ||
          itemsMatch
        );
      }

      return true;
    });
  }, [orders, stageFilter, searchTerm]);

  // Open Refer Back Modal
  const openReferBack = (order, e) => {
    if (e) e.stopPropagation();
    setReferBackModal({
      isOpen: true,
      order,
      note: '',
      error: '',
      submitting: false,
    });
  };

  // Submit Refer Back
  const handleConfirmReferBack = async () => {
    if (!referBackModal.order) return;
    const note = referBackModal.note.trim();

    if (!note) {
      setReferBackModal(prev => ({
        ...prev,
        error: 'Mandatory note is required when referring back an order. Please explain what the sales executive must correct.',
      }));
      return;
    }

    setReferBackModal(prev => ({ ...prev, submitting: true, error: '' }));
    try {
      const orderId = referBackModal.order._id || referBackModal.order.id;
      const payload = {
        status: 'Referred Back',
        department: 'lead_manager',
        role: 'Lead Manager',
        author: currentUser?.name || 'Sarah Jenkins',
        comment: note,
      };

      const res = await api.patch(`/api/leads/${orderId}/approval`, payload);
      if (res.data?.success) {
        showToast(
          `Order #${referBackModal.order.orderId || 'Order'} referred back to ${referBackModal.order.employeeName || 'Sales Executive'} with mandatory note.`,
          'info'
        );
        setReferBackModal({ isOpen: false, order: null, note: '', error: '', submitting: false });
        fetchOrders();
      }
    } catch (err) {
      console.error('Error referring back order:', err);
      setReferBackModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to refer back order. Please try again.',
      }));
    }
  };

  // Open Approve Modal
  const openApprove = (order, e) => {
    if (e) e.stopPropagation();
    setApproveModal({
      isOpen: true,
      order,
      note: '',
      submitting: false,
    });
  };

  // Submit Approval
  const handleConfirmApprove = async () => {
    if (!approveModal.order) return;
    setApproveModal(prev => ({ ...prev, submitting: true }));
    try {
      const orderId = approveModal.order._id || approveModal.order.id;
      const payload = {
        status: 'Approved',
        department: 'lead_manager',
        role: 'Lead Manager',
        author: currentUser?.name || 'Sarah Jenkins',
        comment: approveModal.note.trim() || 'Approved by Lead Manager',
      };

      const res = await api.patch(`/api/leads/${orderId}/approval`, payload);
      if (res.data?.success) {
        showToast(
          `Order #${approveModal.order.orderId || 'Order'} approved! Advanced to next stage (DTF Pending).`,
          'success'
        );
        setApproveModal({ isOpen: false, order: null, note: '', submitting: false });
        fetchOrders();
      }
    } catch (err) {
      console.error('Error approving order:', err);
      showToast(err.response?.data?.message || 'Failed to approve order.', 'error');
      setApproveModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // Navigate to full read-only order form
  const handleViewOrder = (order, e) => {
    if (e) e.stopPropagation();
    const stage = order.normStage || order.orderStage || 'sample';
    navigate(`/order/create-lead?id=${order._id}&from=/approvals&stage=${encodeURIComponent(stage)}`);
  };

  return (
    <div className="lead-approvals-page">
      {/* Toast Alert */}
      {toastMsg && (
        <div className={`approvals-toast ${toastMsg.type}`}>
          {toastMsg.type === 'success' ? (
            <CheckCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{toastMsg.message}</span>
          <button className="toast-close" onClick={() => setToastMsg(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="approvals-header">
        <h1 className="approvals-title">Lead Approval</h1>
        <div className="header-right">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search Order ID, Client, Company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button className="search-clear-btn" onClick={() => setSearchTerm('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="stage-filter-select"
          >
            <option value="all">All Stages</option>
            <option value="sample">Sample Stage</option>
            <option value="partial">Partial Stage</option>
            <option value="complete">Complete Stage</option>
          </select>

          <button className="btn-refresh" onClick={fetchOrders} title="Refresh list">
            <RefreshCw size={15} className={loading ? "spin-animation" : ""} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="approvals-table-container">
        {loading ? (
          <div className="table-loading-state">
            <div className="spinner"></div>
            <p>Loading recent orders for approval...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="table-empty-state">
            <div className="empty-icon-wrap">
              <ClipboardCheck size={36} color="#94a3b8" />
            </div>
            <h3>No orders found</h3>
            <p>
              {searchTerm || stageFilter !== 'all'
                ? 'Try adjusting your search query or filters.'
                : 'No orders available for approval.'}
            </p>
          </div>
        ) : (
          <table className="approvals-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Company</th>
                <th>Pipeline</th>
                <th>Current Stage</th>
                <th>Quantity</th>
                <th>Repeat Customer</th>
                <th>Sales Executive</th>
                <th>Approval Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const status = getApprovalStatus(order);
                const orderId = order.orderId || `ORD-${order._id.slice(-6).toUpperCase()}`;
                const totalQty = order.normalizedQty || (Array.isArray(order.items)
                  ? order.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
                  : order.totalQuantity || 0);
                const isRepeat = (order.repeatedOrder || '').toLowerCase().trim() === 'yes';

                return (
                  <tr
                    key={order._id}
                    className="approval-row"
                    onClick={() => handleViewOrder(order)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace', fontSize: '13px' }}>
                        {orderId}
                      </span>
                    </td>

                    <td style={{ color: '#334155' }}>
                      {order.companyName || '—'}
                    </td>

                    <td style={{ textTransform: 'capitalize', color: '#334155' }}>
                      {order.normStage}
                    </td>

                    <td style={{ textTransform: 'capitalize', color: '#334155' }}>
                      {order.normSub.replace(/-/g, ' ')}
                    </td>

                    <td style={{ color: '#334155' }}>
                      {totalQty ? `${totalQty} pcs` : '—'}
                    </td>

                    <td style={{ color: '#334155' }}>
                      {isRepeat ? 'Repeat' : 'First-time'}
                    </td>

                    <td style={{ color: '#334155' }}>
                      {order.employeeName || 'Sales Executive'}
                    </td>

                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          backgroundColor:
                            status === 'Referred Back'
                              ? '#fee2e2'
                              : status === 'Approved'
                              ? '#d1fae5'
                              : '#fef3c7',
                          color:
                            status === 'Referred Back'
                              ? '#b91c1c'
                              : status === 'Approved'
                              ? '#065f46'
                              : '#b45309',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor:
                              status === 'Referred Back'
                                ? '#dc2626'
                                : status === 'Approved'
                                ? '#059669'
                                : '#d97706',
                          }}
                        />
                        {status}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="btn-action-view"
                          onClick={(e) => handleViewOrder(order, e)}
                          title="View order details (Read-only)"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>

                        {status !== 'Approved' && (
                          <>
                            <button
                              type="button"
                              className="btn-action-refer-back"
                              onClick={(e) => openReferBack(order, e)}
                              title="Refer back to sales executive (mandatory note)"
                            >
                              <RotateCcw size={14} />
                              <span>Refer Back</span>
                            </button>

                            <button
                              type="button"
                              className="btn-action-approve"
                              onClick={(e) => openApprove(order, e)}
                              title="Approve order and advance to DTF Pending"
                            >
                              <CheckCircle size={14} />
                              <span>Submit</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Refer Back Modal with Mandatory Note */}
      {referBackModal.isOpen && referBackModal.order && (
        <div className="approvals-modal-backdrop" onClick={() => !referBackModal.submitting && setReferBackModal({ isOpen: false, order: null, note: '', error: '', submitting: false })}>
          <div className="approvals-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger-header">
              <div className="modal-title-with-icon">
                <RotateCcw size={20} color="#dc2626" />
                <h3>Refer Back Order</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setReferBackModal({ isOpen: false, order: null, note: '', error: '', submitting: false })}
                disabled={referBackModal.submitting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-order-summary">
                <div>
                  <strong>Order ID:</strong> #{referBackModal.order.orderId || referBackModal.order._id?.slice(-6).toUpperCase()}
                </div>
                <div>
                  <strong>Sales Executive:</strong> {referBackModal.order.employeeName || 'Sales Executive'}
                </div>
                <div>
                  <strong>Client / Company:</strong> {referBackModal.order.companyName || referBackModal.order.clientName || '—'}
                </div>
              </div>

              <div className="modal-note-prompt">
                <label className="modal-field-label">
                  Correction Note / Reason for Refer Back <span className="mandatory-star">*</span>
                </label>
                <p className="modal-helper-text">
                  A specific explanation is mandatory so the sales executive knows what corrections are required.
                </p>
                <textarea
                  className={`modal-textarea ${referBackModal.error ? 'input-error' : ''}`}
                  placeholder="Enter mandatory correction instructions for the sales executive (e.g., update fabric, verify quantity, attach correct design file)..."
                  rows={4}
                  value={referBackModal.note}
                  onChange={(e) =>
                    setReferBackModal(prev => ({ ...prev, note: e.target.value, error: '' }))
                  }
                  autoFocus
                />
                {referBackModal.error && (
                  <div className="modal-error-message">
                    <AlertCircle size={14} />
                    <span>{referBackModal.error}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setReferBackModal({ isOpen: false, order: null, note: '', error: '', submitting: false })}
                disabled={referBackModal.submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-confirm-refer"
                onClick={handleConfirmReferBack}
                disabled={referBackModal.submitting}
              >
                <RotateCcw size={15} />
                <span>{referBackModal.submitting ? 'Referring Back...' : 'Confirm Refer Back'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal.isOpen && approveModal.order && (
        <div className="approvals-modal-backdrop" onClick={() => !approveModal.submitting && setApproveModal({ isOpen: false, order: null, note: '', submitting: false })}>
          <div className="approvals-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header success-header">
              <div className="modal-title-with-icon">
                <CheckCircle size={20} color="#059669" />
                <h3>Approve Order Clearance</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setApproveModal({ isOpen: false, order: null, note: '', submitting: false })}
                disabled={approveModal.submitting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-order-summary success-bg">
                <div>
                  <strong>Order ID:</strong> #{approveModal.order.orderId || approveModal.order._id?.slice(-6).toUpperCase()}
                </div>
                <div>
                  <strong>Sales Executive:</strong> {approveModal.order.employeeName || 'Sales Executive'}
                </div>
                <div>
                  <strong>Stage Progression:</strong> Moves from <strong>Sample → Order</strong> to <strong>Sample → DTF Pending</strong>
                </div>
              </div>

              <div className="modal-note-prompt">
                <label className="modal-field-label">Lead Manager Approval Note (Optional)</label>
                <textarea
                  className="modal-textarea"
                  placeholder="Optional remarks or instructions for Production and Stock Room teams..."
                  rows={3}
                  value={approveModal.note}
                  onChange={(e) => setApproveModal(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setApproveModal({ isOpen: false, order: null, note: '', submitting: false })}
                disabled={approveModal.submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-confirm-approve"
                onClick={handleConfirmApprove}
                disabled={approveModal.submitting}
              >
                <CheckCircle size={15} />
                <span>{approveModal.submitting ? 'Approving...' : 'Submit Approval'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
