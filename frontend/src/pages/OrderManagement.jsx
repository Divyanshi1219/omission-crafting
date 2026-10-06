import React, { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutGrid, Plus, Trash2 } from 'lucide-react';

function OrderManagement() {
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const currentSection = pathParts[pathParts.length - 1].replace(/-/g, ' ');

  const formRef = useRef(null);

  const [query, setQuery] = useState('');
  const [queryStatus, setQueryStatus] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [items, setItems] = useState([]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const action = e.nativeEvent.submitter.name;
    if (action === 'save') {
      alert('Lead saved successfully!');
    } else if (action === 'submit') {
      setIsSubmitted(true);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), fabric: '', quantity: '', size: '', color: '' }]);
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const canSubmit = query === 'order' && queryStatus === 'confirmed';

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

                <div className="form-group">
                  <label>Query Status</label>
                  <select value={queryStatus} onChange={(e) => setQueryStatus(e.target.value)}>
                    <option value="">Select status...</option>
                    <option value="phone not pick">Phone not pick</option>
                    <option value="not interested">Not interested</option>
                    <option value="call back">Call back</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Company Name</label>
                  <input type="text" />
                </div>

                <div className="form-group">
                  <label>Client Name</label>
                  <input type="text" />
                </div>

                <div className="form-group">
                  <label>Company Address</label>
                  <input type="text" />
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input type="tel" required />
                </div>

                {(queryStatus === 'phone not pick' || queryStatus === 'call back') ? (
                  <div className="form-group">
                    <label>Schedule</label>
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <input type="date" style={{ flex: 1, padding: '10px' }} />
                      <input type="time" style={{ flex: 1, padding: '10px' }} />
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
                    title={!canSubmit ? "Only available if Query is 'Order' and Status is 'Confirmed'" : ""}
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
                    <input type="text" readOnly placeholder="Auto-generated" style={{ background: 'rgba(0,0,0,0.02)' }} />
                  </div>
                  
                  <div className="form-group">
                    <label>Logo Name</label>
                    <input type="text" />
                  </div>

                  <div className="form-group">
                    <label>Order Stage *</label>
                    <select required>
                      <option value="">Select stage...</option>
                      <option value="open">Open</option>
                      <option value="under procurement">Under Procurement</option>
                      <option value="quality control">Quality Control</option>
                      <option value="delivery pending">Delivery Pending</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Total Quantity (pcs) *</label>
                    <input type="number" required />
                  </div>

                  <div className="form-group">
                    <label>Total Amount *</label>
                    <input type="number" required />
                  </div>

                  <div className="form-group">
                    <label>Advance Amount *</label>
                    <input type="number" required />
                  </div>

                  <div className="form-group">
                    <label>Pending Amount *</label>
                    <input type="number" required />
                  </div>

                  <div className="form-group">
                    <label>Delivery Date *</label>
                    <input type="date" required />
                  </div>

                  <div className="form-group">
                    <label>Urgency *</label>
                    <select required>
                      <option value="">Select urgency...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
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
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Fabric *</label>
                            <input type="text" required style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Quantity *</label>
                            <input type="number" required style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Size *</label>
                            <input type="text" required style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Color *</label>
                            <input type="text" required style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
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
                    onClick={() => {
                      alert('Lead and Order Information Submitted successfully!');
                      setIsSubmitted(false);
                      setItems([]);
                      setQuery('');
                      setQueryStatus('');
                      if (formRef.current) formRef.current.reset();
                    }} 
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
        <div className="chart-body centered empty-chart" style={{ flex: 1 }}>
          <p style={{ color: '#64748b', fontSize: '15px' }}>
            No data available for {currentSection || 'Order Management'} yet.
          </p>
        </div>
      </div>
    </div>
  );
}

export default OrderManagement;
