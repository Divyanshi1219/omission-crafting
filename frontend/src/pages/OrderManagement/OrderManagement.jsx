import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Plus, Trash2 } from 'lucide-react';
import api from '../api';
import './OrderManagement.css';

const FULL_ORDER_STAGES = [
  'New',
  'Order',
  'DTF Pending',
  'Stock',
  'Printing',
  'Quality Check',
  'Packaging',
  'Delivery Pending',
  'Delivery'
];

const SAMPLE_STAGES = [
  'Leads',
  'Order',
  'DTF Pending',
  'Stock',
  'Printing',
  'Customer Approved'
];

const PARTIAL_STAGES = [
  'Leads',
  'Order',
  'DTF Pending',
  'Stock',
  'Printing',
  'Quality Check',
  'Payment Status'
];

const COMPLETE_STAGES = [
  'Leads',
  'Order',
  'DTF Pending',
  'Stock',
  'Printing',
  'Quality Check',
  'Packaging',
  'Delivery Pending',
  'Delivery'
];

const SUB_STAGES_BY_ORDER_STAGE = {
  sample: [
    'New',
    'Order',
    'DTF Pending',
    'Stock',
    'Printing',
    'Customer Approved'
  ],
  partial: [
    'New',
    'Order',
    'DTF Pending',
    'Stock',
    'Printing',
    'Quality Check',
    'Payment Status'
  ],
  complete: [
    'New',
    'Order',
    'DTF Pending',
    'Stock',
    'Printing',
    'Quality Check',
    'Packaging',
    'Delivery Pending',
    'Delivery'
  ]
};

const STAGE_ROUTE_MAP = {
  '/order/create-lead': 'New',
  '/order/leads': 'New',
  '/order/order': 'Order',
  '/order/dtf-pending': 'DTF Pending',
  '/order/stock': 'Stock',
  '/order/printing': 'Printing',
  '/order/quality-check': 'Quality Check',
  '/order/packaging': 'Packaging',
  '/order/delivery-pending': 'Delivery Pending',
  '/order/delivery': 'Delivery',

  // Sample child routes
  '/order/sample': 'Leads',
  '/order/sample/leads': 'Leads',
  '/order/sample/order': 'Order',
  '/order/sample/dtf-pending': 'DTF Pending',
  '/order/sample/stock': 'Stock',
  '/order/sample/printing': 'Printing',
  '/order/sample/customer-approved': 'Customer Approved',

  // Partial child routes
  '/order/partial': 'Leads',
  '/order/partial/leads': 'Leads',
  '/order/partial/order': 'Order',
  '/order/partial/dtf-pending': 'DTF Pending',
  '/order/partial/stock': 'Stock',
  '/order/partial/printing': 'Printing',
  '/order/partial/quality-check': 'Quality Check',
  '/order/partial/payment-status': 'Payment Status',

  // Complete child routes
  '/order/complete': 'Leads',
  '/order/complete/leads': 'Leads',
  '/order/complete/order': 'Order',
  '/order/complete/dtf-pending': 'DTF Pending',
  '/order/complete/stock': 'Stock',
  '/order/complete/printing': 'Printing',
  '/order/complete/quality-check': 'Quality Check',
  '/order/complete/packaging': 'Packaging',
  '/order/complete/delivery-pending': 'Delivery Pending',
  '/order/complete/delivery': 'Delivery',
};

function OrderManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentSection = pathParts[pathParts.length - 1]?.replace(/-/g, ' ') || 'Order Management';

  const formRef = useRef(null);

  const isCustomerSupport = location.pathname === '/order/customer-support';

  const [query, setQuery] = useState('');
  const [queryStatus, setQueryStatus] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedStage, setSelectedStage] = useState('New');
  const [orderStage, setOrderStage] = useState('');
  const [subStage, setSubStage] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    clientName: '',
    companyAddress: '',
    state: '',
    pincode: '',
    phoneNumber: '',
    scheduleDate: '',
    scheduleTime: '',
    additionalNote: '',
    orderId: '',
    logoName: '',
    totalQuantity: '',
    pricePerPiece: '',
    totalAmount: '',
    gst: '',
    netAmount: '',
    advanceAmount: '',
    pendingAmount: '',
    deliveryDate: '',
    urgency: '',
    modeOfDelivery: '',
  });

  const [leadsList, setLeadsList] = useState([]);

  // Load pre-filled data when an id is in the URL
  useEffect(() => {
    if (location.pathname === '/order/create-lead') {
      if (editId) {
        api.get(`/api/leads/${editId}`)
          .then((res) => {
            if (res.data?.data) {
              const d = res.data.data;
              setQuery(d.query || '');
              setQueryStatus(d.queryStatus || '');
              setOrderStage(d.orderStage || '');
              setSubStage(d.subStage || '');
              setItems(d.items || []);
              setFormData({
                companyName: d.companyName || '',
                clientName: d.clientName || '',
                companyAddress: d.companyAddress || '',
                state: d.state || '',
                pincode: d.pincode || '',
                phoneNumber: d.phoneNumber || '',
                scheduleDate: d.scheduleDate || '',
                scheduleTime: d.scheduleTime || '',
                additionalNote: d.additionalNote || '',
                orderId: d.orderId || '',
                logoName: d.logoName || '',
                totalQuantity: d.totalQuantity || '',
                pricePerPiece: d.pricePerPiece || '',
                totalAmount: d.totalAmount || '',
                gst: d.gst || '',
                netAmount: d.netAmount || '',
                advanceAmount: d.advanceAmount || '',
                pendingAmount: d.pendingAmount || '',
                deliveryDate: d.deliveryDate || '',
                urgency: d.urgency || '',
                modeOfDelivery: d.modeOfDelivery || '',
              });
              if (d.query === 'order' || d.orderStage) {
                setIsSubmitted(true);
              }
            }
          })
          .catch((err) => console.error('Error loading lead for edit:', err));
      } else {
        setQuery('');
        setQueryStatus('');
        setOrderStage('');
        setSubStage('');
        setItems([]);
        setIsSubmitted(false);
        setFormData({
          companyName: '',
          clientName: '',
          companyAddress: '',
          state: '',
          pincode: '',
          phoneNumber: '',
          scheduleDate: '',
          scheduleTime: '',
          additionalNote: '',
          orderId: '',
          logoName: '',
          totalQuantity: '',
          pricePerPiece: '',
          totalAmount: '',
          gst: '',
          netAmount: '',
          advanceAmount: '',
          pendingAmount: '',
          deliveryDate: '',
          urgency: '',
          modeOfDelivery: '',
        });
      }
    }
  }, [location.pathname, editId]);

  // Fetch leads list for stage and sub-stage table visibility
  useEffect(() => {
    if (location.pathname !== '/order/create-lead') {
      api.get('/api/leads')
        .then((res) => {
          if (res.data?.data) {
            setLeadsList(res.data.data);
          }
        })
        .catch((err) => console.error('Error fetching leads:', err));
    }
  }, [location.pathname]);

  const getCurrentStages = () => {
    if (location.pathname.startsWith('/order/sample')) {
      return SAMPLE_STAGES;
    }
    if (location.pathname.startsWith('/order/partial')) {
      return PARTIAL_STAGES;
    }
    if (location.pathname.startsWith('/order/complete')) {
      return COMPLETE_STAGES;
    }
    return FULL_ORDER_STAGES;
  };

  useEffect(() => {
    if (STAGE_ROUTE_MAP[location.pathname]) {
      setSelectedStage(STAGE_ROUTE_MAP[location.pathname]);
    } else {
      const currentStages = getCurrentStages();
      if (currentStages && currentStages.length > 0) {
        setSelectedStage(currentStages[0]);
      }
    }
  }, [location.pathname]);

  const renderChangeManagementBar = () => {
    const stages = getCurrentStages();
    return (
      <div className="change-mgmt-wrapper">
        <div className="change-mgmt-track" role="tablist" aria-label="Order Lifecycle Stages">
          {stages.map((stage) => {
            const isActive =
              selectedStage === stage ||
              (selectedStage === 'New' && stage === 'Leads') ||
              (selectedStage === 'Leads' && stage === 'New');
            return (
              <button
                key={stage}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`change-mgmt-step ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setSelectedStage(stage);
                  const stageSlug = stage.toLowerCase().replace(/\s+/g, '-');
                  if (location.pathname.startsWith('/order/sample')) {
                    const target = stageSlug === 'new' ? 'leads' : stageSlug;
                    navigate(`/order/sample/${target}`);
                  } else if (location.pathname.startsWith('/order/partial')) {
                    const target = stageSlug === 'new' ? 'leads' : stageSlug;
                    navigate(`/order/partial/${target}`);
                  } else if (location.pathname.startsWith('/order/complete')) {
                    const target = stageSlug === 'new' ? 'leads' : stageSlug;
                    navigate(`/order/complete/${target}`);
                  }
                }}
                title={`Stage: ${stage}`}
              >
                <span className="step-label">{stage}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const action = e.nativeEvent?.submitter?.name;
    if (action === 'save') {
      try {
        const payload = {
          employeeName: 'Divyanshi',
          query: query || 'lead',
          queryStatus,
          orderStage,
          subStage,
          ...formData,
          items,
        };
        if (editId) payload._id = editId;
        await api.post('/api/leads', payload);
        alert('Lead saved successfully!');
        if (orderStage) {
          const target = !subStage || subStage === 'new' ? 'leads' : subStage.replace(/\s+/g, '-');
          navigate(`/order/${orderStage}/${target}`);
        } else {
          navigate('/order/sample/leads');
        }
      } catch (err) {
        console.error('Error saving lead:', err);
        alert('Failed to save lead: ' + (err.response?.data?.message || err.message));
      }
    } else if (action === 'submit') {
      setIsSubmitted(true);
    }
  };

  const handleOrderSubmit = async () => {
    try {
      const payload = {
        employeeName: 'Divyanshi',
        query: 'order',
        queryStatus,
        orderStage,
        subStage,
        ...formData,
        items,
      };
      if (editId) payload._id = editId;
      await api.post('/api/leads', payload);
      alert('Lead and Order Information Submitted successfully!');
      setIsSubmitted(false);
      setItems([]);
      setQuery('');
      setQueryStatus('');
      setOrderStage('');
      setSubStage('');
      if (formRef.current) formRef.current.reset();

      if (orderStage && subStage) {
        const target = subStage === 'new' ? 'leads' : subStage.replace(/\s+/g, '-');
        navigate(`/order/${orderStage}/${target}`);
      } else {
        navigate('/order/sample/order');
      }
    } catch (err) {
      console.error('Error submitting order:', err);
      alert('Failed to submit order: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), item: '', fabric: '', quantity: '', size: '', color: '', printingType: '', sublimationOption: '' }]);
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const canSubmit = query === 'order';

  // Filter leads table data based on stage and sub-stage
  let currentStage = '';
  let currentSubStage = '';

  if (pathParts.length >= 3) {
    currentStage = pathParts[1].toLowerCase();
    currentSubStage = pathParts[2].toLowerCase();
  } else if (pathParts.length === 2) {
    if (['sample', 'partial', 'complete'].includes(pathParts[1].toLowerCase())) {
      currentStage = pathParts[1].toLowerCase();
      currentSubStage = 'leads';
    } else {
      currentSubStage = pathParts[1].toLowerCase();
    }
  }

  const matchingLeads = leadsList.filter((item) => {
    const itemStage = (item.orderStage || '').toLowerCase().trim();
    const itemSub = (item.subStage || '').toLowerCase().trim();

    if (currentStage) {
      if (itemStage && itemStage !== currentStage) {
        return false;
      }
      if (!itemStage && currentStage !== 'sample') {
        return false;
      }
    }

    if (currentSubStage === 'leads' || currentSubStage === 'new') {
      return itemSub === 'new' || itemSub === 'leads' || itemSub === '' || item.query === 'lead';
    }

    if (currentSubStage === 'order') {
      return itemSub === 'order' || (item.query === 'order' && (!itemSub || itemSub === 'new'));
    }

    const normItemSub = itemSub.replace(/-/g, ' ');
    const normCurrentSub = currentSubStage.replace(/-/g, ' ');
    return normItemSub === normCurrentSub;
  });

  if (location.pathname === '/order/create-lead') {
    return (
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <h1>Create Lead</h1>
            <p>Fill out the form below to create a new lead.</p>
          </div>
          <div className="header-actions">
            {/* Save Lead button removed from top header */}
          </div>
        </div>

        <div className="dashboard-content">
          {/* Change Management Process Flow Chevron Tracker */}
          {renderChangeManagementBar()}

          <form className="form-container" onSubmit={handleFormSubmit} ref={formRef}>
            <div className="form-section">
              <div className="form-section-title">Lead Form</div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Employee Name</label>
                  <input type="text" value="Divyanshi" readOnly style={{ background: 'rgba(0,0,0,0.02)', cursor: 'not-allowed', color: '#64748b' }} />
                </div>
                
                <div className="form-group">
                  <label>Query</label>
                  <select value={query} onChange={(e) => setQuery(e.target.value)}>
                    <option value="">Select query type...</option>
                    <option value="lead">Lead</option>
                    <option value="order">Order</option>
                  </select>
                </div>

                {/* <div className="form-group">
                  <label>Query Status</label>
                  <select value={queryStatus} onChange={(e) => setQueryStatus(e.target.value)}>
                    <option value="">Select status...</option>
                    <option value="phone not pick">Phone not pick</option>
                    <option value="not interested">Not interested</option>
                    <option value="call back">Call back</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </div> */}

                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Client Name</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Company Address</label>
                  <input
                    type="text"
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Pincode *</label>
                  <input
                    type="text"
                    required
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>

                {(queryStatus === 'phone not pick' || queryStatus === 'call back') ? (
                  <div className="form-group">
                    <label>Schedule</label>
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <input
                        type="date"
                        value={formData.scheduleDate}
                        onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                        style={{ flex: 1, padding: '10px' }}
                      />
                      <input
                        type="time"
                        value={formData.scheduleTime}
                        onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                        style={{ flex: 1, padding: '10px' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div></div>
                )}
              </div>

              <div className="form-group" style={{ display: 'block', marginTop: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>Additional Note</label>
                <textarea 
                  rows="4" 
                  value={formData.additionalNote}
                  onChange={(e) => setFormData({ ...formData, additionalNote: e.target.value })}
                  style={{ 
                    width: '100%', padding: '12px 14px', borderRadius: '8px', 
                    border: '1px solid #cbd5e1', background: 'white', color: '#334155', 
                    resize: 'vertical', fontFamily: 'inherit', outline: 'none'
                  }}
                ></textarea>
              </div>
              
              {!isSubmitted && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
                  <button type="submit" name="save" className="btn-secondary" style={{ padding: '10px 24px' }}>
                    Save
                  </button>
                  <button 
                    type="submit" 
                    name="submit" 
                    className="btn-primary" 
                    disabled={!canSubmit} 
                    title={!canSubmit ? "Only available if Query is 'Order'" : ""}
                    style={{ padding: '10px 24px', opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
                  >
                    Submit
                  </button>
                </div>
              )}
            </div>

            {/* MORE INFORMATION FORM */}
            {isSubmitted && (
              <div className="form-section" style={{ marginTop: '24px' }}>
                <div className="form-section-title">Order Information</div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Order ID</label>
                    <input
                      type="text"
                      value={formData.orderId}
                      onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                      placeholder="Auto-generated"
                      style={{ background: 'rgba(0,0,0,0.02)' }}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Logo Name</label>
                    <input
                      type="text"
                      value={formData.logoName}
                      onChange={(e) => setFormData({ ...formData, logoName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Order Stage *</label>
                    <select 
                      required 
                      value={orderStage} 
                      onChange={(e) => {
                        setOrderStage(e.target.value);
                        setSubStage('');
                      }}
                    >
                      <option value="">Select stage...</option>
                      <option value="sample">Sample</option>
                      <option value="partial">Partial</option>
                      <option value="complete">Complete</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Sub Stage *</label>
                    <select 
                      required 
                      value={subStage} 
                      onChange={(e) => setSubStage(e.target.value)}
                      disabled={!orderStage}
                      style={!orderStage ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
                    >
                      <option value="">{orderStage ? 'Select sub stage...' : 'Select order stage first'}</option>
                      {orderStage && SUB_STAGES_BY_ORDER_STAGE[orderStage]?.map((stage) => (
                        <option key={stage} value={stage.toLowerCase()}>{stage}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Total Quantity (pcs) *</label>
                    <input
                      type="number"
                      required
                      value={formData.totalQuantity}
                      onChange={(e) => setFormData({ ...formData, totalQuantity: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Price Per Piece *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.pricePerPiece}
                      onChange={(e) => setFormData({ ...formData, pricePerPiece: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Amount *</label>
                    <input
                      type="number"
                      required
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>GST</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.gst}
                      onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Net Amount *</label>
                    <input
                      type="number"
                      required
                      value={formData.netAmount}
                      onChange={(e) => setFormData({ ...formData, netAmount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Advance Amount *</label>
                    <input
                      type="number"
                      required
                      value={formData.advanceAmount}
                      onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Pending Amount *</label>
                    <input
                      type="number"
                      required
                      value={formData.pendingAmount}
                      onChange={(e) => setFormData({ ...formData, pendingAmount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Delivery Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Urgency *</label>
                    <select
                      required
                      value={formData.urgency}
                      onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    >
                      <option value="">Select urgency...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Mode of Delivery *</label>
                    <select
                      required
                      value={formData.modeOfDelivery}
                      onChange={(e) => setFormData({ ...formData, modeOfDelivery: e.target.value })}
                    >
                      <option value="">Select mode...</option>
                      <option value="cash on delivery">Cash on Delivery</option>
                      <option value="transportation">Transportation</option>
                      <option value="courier">Courier</option>
                      <option value="self pick up">Self Pick up</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '32px' }}>
                  <button type="button" onClick={handleAddItem} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={16} /> Add Item
                  </button>
                  
                  {items.length > 0 && (
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {items.map((item) => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Item *</label>
                            <input type="text" required value={item.item || ''} onChange={(e) => handleItemChange(item.id, 'item', e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                          </div>
                          
                          {['t-shirt', 't shirt', 'tshirt'].includes((item.item || '').toLowerCase().trim()) && (
                            <div style={{ flex: '1 1 110px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Printing Type</label>
                              <select value={item.printingType || ''} onChange={(e) => handleItemChange(item.id, 'printingType', e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}>
                                <option value="">Select...</option>
                                <option value="DTF">DTF</option>
                                <option value="Sublimation">Sublimation</option>
                                <option value="Embroidery">Embroidery</option>
                              </select>
                            </div>
                          )}

                          {['t-shirt', 't shirt', 'tshirt'].includes((item.item || '').toLowerCase().trim()) && (item.printingType || '') === 'Sublimation' && (
                            <div style={{ flex: '1 1 70px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Option</label>
                              <select value={item.sublimationOption || ''} onChange={(e) => handleItemChange(item.id, 'sublimationOption', e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}>
                                <option value="">Select...</option>
                                <option value="1/2">1/2</option>
                                <option value="1">1</option>
                              </select>
                            </div>
                          )}

                          <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Fabric *</label>
                            <input type="text" required value={item.fabric || ''} onChange={(e) => handleItemChange(item.id, 'fabric', e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                          </div>
                          <div style={{ flex: '1 1 70px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Quantity *</label>
                            <input type="number" required value={item.quantity || ''} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                          </div>
                          <div style={{ flex: '1 1 70px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Size *</label>
                            <input type="text" required value={item.size || ''} onChange={(e) => handleItemChange(item.id, 'size', e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                          </div>
                          <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Color *</label>
                            <input type="text" required value={item.color || ''} onChange={(e) => handleItemChange(item.id, 'color', e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                          </div>
                          <button type="button" onClick={() => handleRemoveItem(item.id)} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
                  <button 
                    type="button" 
                    onClick={handleOrderSubmit}
                    className="btn-primary" 
                    style={{ padding: '10px 32px' }}
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}
            
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <h2 style={{ textTransform: 'capitalize' }}>{currentSection || 'Order Management'}</h2>
      </div>

      {!isCustomerSupport && renderChangeManagementBar()}
      
      <div className="chart-card hover-scale" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
        <div className="chart-header">
          <div className="chart-title-sec">
            <div>
              <h3 style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LayoutGrid size={16} color="#64748b" /> {currentSection || 'Order Management'}
              </h3>
            </div>
          </div>
        </div>

        {matchingLeads.length === 0 ? (
          <div className="chart-body centered empty-chart" style={{ flex: 1 }}>
            <p style={{ color: '#64748b', fontSize: '15px' }}>
              No data available for {currentSection || 'Order Management'} yet.
            </p>
          </div>
        ) : (
          <div style={{ padding: '16px 20px', overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
                  <th style={{ padding: '10px 12px' }}>Client Name</th>
                  <th style={{ padding: '10px 12px' }}>Company</th>
                  <th style={{ padding: '10px 12px' }}>Employee</th>
                  <th style={{ padding: '10px 12px' }}>Phone</th>
                  <th style={{ padding: '10px 12px' }}>Stage</th>
                  <th style={{ padding: '10px 12px' }}>Sub Stage</th>
                  <th style={{ padding: '10px 12px' }}>Quantity</th>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {matchingLeads.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => navigate(`/order/create-lead?id=${item._id}`)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    title="Click to view and edit pre-filled data"
                  >
                    <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>
                      {item.clientName || 'Unnamed Client'}
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>
                      {item.companyName || '—'}
                    </td>
                    <td style={{ padding: '12px', color: '#64748b' }}>
                      {item.employeeName || 'Divyanshi'}
                    </td>
                    <td style={{ padding: '12px', color: '#64748b' }}>
                      {item.phoneNumber || '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#e0f2fe',
                          color: '#0369a1',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.orderStage || 'Sample'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#f3e8ff',
                          color: '#6b21a8',
                          textTransform: 'capitalize',
                        }}
                      >
                        {item.subStage === 'new' ? 'Leads' : item.subStage || 'Leads'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>
                      {item.totalQuantity ? `${item.totalQuantity} pcs` : '—'}
                    </td>
                    <td style={{ padding: '12px', color: '#94a3b8', fontSize: '12px' }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderManagement;
