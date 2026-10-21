import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Plus, Trash2, ArrowLeft, RotateCcw, AlertCircle, CheckCircle2, Paperclip, Upload, FileText, Check } from 'lucide-react';
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
  'Order',
  'DTF Pending',
  'Stock',
  'Printing',
  'Customer Approved'
];

const PARTIAL_STAGES = [
  'Order',
  'DTF Pending',
  'Stock',
  'Printing',
  'Quality Check',
  'Payment Status'
];

const COMPLETE_STAGES = [
  'Order',
  'DTF Pending',
  'Stock',
  'Printing',
  'Quality Check',
  'Packaging',
  'Delivery Pending',
  'Delivery'
];

const ORDER_DEFINITIONS = [
  { label: 'Sample', slug: 'sample' },
  { label: 'Partial', slug: 'partial' },
  { label: 'Complete', slug: 'complete' }
];

const SUB_STAGES_BY_ORDER_STAGE = {
  sample: [
    'Order',
    'DTF Pending',
    'Stock',
    'Printing',
    'Customer Approved'
  ],
  partial: [
    'Order',
    'DTF Pending',
    'Stock',
    'Printing',
    'Quality Check',
    'Payment Status'
  ],
  complete: [
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
  '/order/sample': 'Order',
  '/order/sample/leads': 'Order',
  '/order/sample/order': 'Order',
  '/order/sample/dtf-pending': 'DTF Pending',
  '/order/sample/stock': 'Stock',
  '/order/sample/printing': 'Printing',
  '/order/sample/customer-approved': 'Customer Approved',

  // Partial child routes
  '/order/partial': 'Order',
  '/order/partial/leads': 'Order',
  '/order/partial/order': 'Order',
  '/order/partial/dtf-pending': 'DTF Pending',
  '/order/partial/stock': 'Stock',
  '/order/partial/printing': 'Printing',
  '/order/partial/quality-check': 'Quality Check',
  '/order/partial/payment-status': 'Payment Status',

  // Complete child routes
  '/order/complete': 'Order',
  '/order/complete/leads': 'Order',
  '/order/complete/order': 'Order',
  '/order/complete/dtf-pending': 'DTF Pending',
  '/order/complete/stock': 'Stock',
  '/order/complete/printing': 'Printing',
  '/order/complete/quality-check': 'Quality Check',
  '/order/complete/packaging': 'Packaging',
  '/order/complete/delivery-pending': 'Delivery Pending',
  '/order/complete/delivery': 'Delivery',
};

const getDefaultDeliveryDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function OrderManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentSection = pathParts[pathParts.length - 1]?.replace(/-/g, ' ') || 'Order Management';

  const formRef = useRef(null);
  const fileInputRef = useRef(null);

  const isCustomerSupport = location.pathname === '/order/customer-support';

  const [query, setQuery] = useState('lead');
  const [queryStatus, setQueryStatus] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedStage, setSelectedStage] = useState('New');
  const [orderStage, setOrderStage] = useState('');
  const [subStage, setSubStage] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    clientName: '',
    companyAddress: '',
    state: '',
    pincode: '',
    phoneNumber: '',
    repeatedOrder: 'No',
    scheduleDate: '',
    scheduleTime: '',
    additionalNote: '',
    orderId: '',
    attachment: '',
    attachmentName: '',
    logoName: '',
    totalQuantity: '',
    pricePerPiece: '',
    totalAmount: '',
    gst: '',
    netAmount: '',
    advanceAmount: '',
    pendingAmount: '',
    deliveryDate: getDefaultDeliveryDate(),
    urgency: '',
    modeOfDelivery: '',
  });

  const [leadsList, setLeadsList] = useState([]);
  const [orderApprovalData, setOrderApprovalData] = useState(null);

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('Attachment file size must be under 8MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        attachment: reader.result,
        attachmentName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setFormData((prev) => ({
      ...prev,
      attachment: '',
      attachmentName: '',
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Quantities for validation
  const itemsTotalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const orderTotalQty = Number(formData.totalQuantity) || 0;

  const getStockApproval = () => {
    if (orderApprovalData?.stockApproval?.status) {
      return orderApprovalData.stockApproval;
    }
    const comments = orderApprovalData?.approvalComments || [];
    const stockComment = [...comments].reverse().find(c =>
      (c.role && c.role.toLowerCase().includes('stock')) ||
      (c.author && c.author.toLowerCase().includes('elena')) ||
      (c.comment && c.comment.toLowerCase().includes('stock'))
    );
    if (stockComment) {
      return {
        status: stockComment.status || 'Pending',
        note: stockComment.comment || '',
        author: stockComment.author || 'Elena Rostova',
      };
    }
    return {
      status: orderApprovalData?.approvalStatus || 'Pending',
      note: '',
      author: 'Elena Rostova',
    };
  };

  const getProductionApproval = () => {
    if (orderApprovalData?.productionApproval?.status) {
      return orderApprovalData.productionApproval;
    }
    const comments = orderApprovalData?.approvalComments || [];
    const prodComment = [...comments].reverse().find(c =>
      (c.role && c.role.toLowerCase().includes('production')) ||
      (c.author && c.author.toLowerCase().includes('marcus')) ||
      (c.comment && c.comment.toLowerCase().includes('production'))
    );
    if (prodComment) {
      return {
        status: prodComment.status || 'Pending',
        note: prodComment.comment || '',
        author: prodComment.author || 'Marcus Vance',
      };
    }
    return {
      status: orderApprovalData?.approvalStatus || 'Pending',
      note: '',
      author: 'Marcus Vance',
    };
  };

  const stockAppr = getStockApproval();
  const prodAppr = getProductionApproval();
  const isOrderReferredBack =
    orderApprovalData?.approvalStatus === 'Referred Back' ||
    stockAppr.status === 'Referred Back' ||
    prodAppr.status === 'Referred Back';

  // Load pre-filled data when an id is in the URL
  useEffect(() => {
    if (location.pathname === '/order/create-lead') {
      if (editId) {
        api.get(`/api/leads/${editId}`)
          .then((res) => {
            if (res.data?.data) {
              const d = res.data.data;
              setOrderApprovalData(d);
              const q = (d.query || 'lead').toLowerCase();
              setQuery(q);
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
                repeatedOrder: d.repeatedOrder || 'No',
                scheduleDate: d.scheduleDate || '',
                scheduleTime: d.scheduleTime || '',
                additionalNote: d.additionalNote || '',
                orderId: d.orderId || '',
                attachment: d.attachment || '',
                attachmentName: d.attachmentName || '',
                logoName: d.logoName || '',
                totalQuantity: d.totalQuantity || '',
                pricePerPiece: d.pricePerPiece || '',
                totalAmount: d.totalAmount || '',
                gst: d.gst || '',
                netAmount: d.netAmount || '',
                advanceAmount: d.advanceAmount || '',
                pendingAmount: d.pendingAmount || '',
                deliveryDate: d.deliveryDate ? (d.deliveryDate.includes('T') ? d.deliveryDate.split('T')[0] : d.deliveryDate) : getDefaultDeliveryDate(),
                urgency: d.urgency || '',
                modeOfDelivery: d.modeOfDelivery || '',
              });
              setIsSubmitted(true);
            }
          })
          .catch((err) => console.error('Error loading lead for edit:', err));
      } else {
        setOrderApprovalData(null);
        setQuery('lead');
        setQueryStatus('');
        setOrderStage('');
        setSubStage('');
        setItems([]);
        setIsSubmitted(false);
        setPhoneTouched(false);
        setFormData({
          companyName: '',
          clientName: '',
          companyAddress: '',
          state: '',
          pincode: '',
          phoneNumber: '',
          repeatedOrder: 'No',
          scheduleDate: '',
          scheduleTime: '',
          additionalNote: '',
          orderId: '',
          attachment: '',
          attachmentName: '',
          logoName: '',
          totalQuantity: '',
          pricePerPiece: '',
          totalAmount: '',
          gst: '',
          netAmount: '',
          advanceAmount: '',
          pendingAmount: '',
          deliveryDate: getDefaultDeliveryDate(),
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

  // Auto-calculate Total Amount = Total Quantity * Price Per Piece
  useEffect(() => {
    if (formData.totalQuantity !== '' && formData.pricePerPiece !== '') {
      const qty = parseFloat(formData.totalQuantity);
      const price = parseFloat(formData.pricePerPiece);
      if (!isNaN(qty) && !isNaN(price)) {
        const calculated = Math.round(qty * price * 100) / 100;
        setFormData((prev) => {
          if (Number(prev.totalAmount) === calculated && prev.totalAmount !== '') return prev;
          return { ...prev, totalAmount: calculated };
        });
      }
    }
  }, [formData.totalQuantity, formData.pricePerPiece]);

  // Auto-calculate Net Amount = Total Amount + (Total Amount * (GST / 100))
  useEffect(() => {
    if (formData.totalAmount !== '') {
      const total = parseFloat(formData.totalAmount);
      const gstPercent = parseFloat(formData.gst) || 0;
      if (!isNaN(total)) {
        const calculatedNet = Math.round((total + (total * (gstPercent / 100))) * 100) / 100;
        setFormData((prev) => {
          if (Number(prev.netAmount) === calculatedNet && prev.netAmount !== '') return prev;
          return { ...prev, netAmount: calculatedNet };
        });
      }
    }
  }, [formData.totalAmount, formData.gst]);

  // Auto-calculate Pending Amount:
  // If GST entered: pendingAmount = netAmount - advanceAmount
  // If GST not entered: pendingAmount = totalAmount - advanceAmount
  useEffect(() => {
    if (formData.totalAmount !== '') {
      const total = parseFloat(formData.totalAmount);
      if (isNaN(total)) return;

      const hasGst = formData.gst !== '' && !isNaN(parseFloat(formData.gst));
      const advance = parseFloat(formData.advanceAmount) || 0;

      let baseAmount = total;
      if (hasGst) {
        if (formData.netAmount !== '' && !isNaN(parseFloat(formData.netAmount))) {
          baseAmount = parseFloat(formData.netAmount);
        } else {
          const gstPercent = parseFloat(formData.gst) || 0;
          baseAmount = Math.round((total + (total * (gstPercent / 100))) * 100) / 100;
        }
      }

      const calculatedPending = Math.round((baseAmount - advance) * 100) / 100;
      setFormData((prev) => {
        if (Number(prev.pendingAmount) === calculatedPending && prev.pendingAmount !== '') return prev;
        return { ...prev, pendingAmount: calculatedPending };
      });
    }
  }, [formData.totalAmount, formData.netAmount, formData.gst, formData.advanceAmount]);

  const getActiveDefinition = () => {
    if (location.pathname.startsWith('/order/sample')) return 'sample';
    if (location.pathname.startsWith('/order/partial')) return 'partial';
    if (location.pathname.startsWith('/order/complete')) return 'complete';

    if (orderStage) {
      const os = orderStage.toLowerCase().trim();
      if (['sample', 'partial', 'complete'].includes(os)) return os;
    }
    const from = searchParams.get('from');
    if (from) {
      if (from.startsWith('/order/sample')) return 'sample';
      if (from.startsWith('/order/partial')) return 'partial';
      if (from.startsWith('/order/complete')) return 'complete';
    }
    if (editId) return 'sample';
    return '';
  };

  const getCurrentStages = () => {
    const activeDef = getActiveDefinition();
    if (activeDef === 'sample') {
      return SAMPLE_STAGES;
    }
    if (activeDef === 'partial') {
      return PARTIAL_STAGES;
    }
    if (activeDef === 'complete') {
      return COMPLETE_STAGES;
    }
    return FULL_ORDER_STAGES;
  };

  useEffect(() => {
    if (editId) {
      const activeStages = getCurrentStages();
      if (subStage) {
        const normSub = subStage.toLowerCase().replace(/\s+/g, '-');
        const matched = activeStages.find(s => s.toLowerCase().replace(/\s+/g, '-') === normSub);
        if (matched) {
          setSelectedStage(matched);
          return;
        }
      }
      if (activeStages && activeStages.length > 0) {
        setSelectedStage(activeStages[0]);
      }
    } else if (STAGE_ROUTE_MAP[location.pathname]) {
      setSelectedStage(STAGE_ROUTE_MAP[location.pathname]);
    } else {
      const currentStages = getCurrentStages();
      if (currentStages && currentStages.length > 0) {
        setSelectedStage(currentStages[0]);
      }
    }
  }, [location.pathname, editId, subStage, orderStage]);

  const renderDefinitionBar = () => {
    const currentDefinition = getActiveDefinition();
    if (!currentDefinition) return null;

    return (
      <div className="change-mgmt-wrapper definition-bar-wrapper">
        <div className="change-mgmt-track" role="tablist" aria-label="Definition Bar">
          {ORDER_DEFINITIONS.map((def) => {
            const isActive = currentDefinition === def.slug;
            return (
              <button
                key={def.slug}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`change-mgmt-step definition-step ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (location.pathname === '/order/create-lead') {
                    setOrderStage(def.slug);
                    const targetAllowedSubStages = (SUB_STAGES_BY_ORDER_STAGE[def.slug] || []).map(s => s.toLowerCase());
                    const currentSubNorm = (subStage || 'order').toLowerCase().replace(/\s+/g, '-').replace(/-/g, ' ');
                    if (!targetAllowedSubStages.includes(currentSubNorm)) {
                      setSubStage('order');
                      setSelectedStage('Order');
                    }
                  } else {
                    const currentSub = pathParts[2]?.toLowerCase() || 'order';
                    const targetAllowedSubStages = (SUB_STAGES_BY_ORDER_STAGE[def.slug] || []).map(s => s.toLowerCase().replace(/\s+/g, '-'));
                    const targetSub = targetAllowedSubStages.includes(currentSub) ? currentSub : 'order';
                    navigate(`/order/${def.slug}/${targetSub}`);
                  }
                }}
                title={`Definition: ${def.label}`}
              >
                <span className="step-label">{def.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderChangeManagementBar = () => {
    const stages = getCurrentStages();
    return (
      <div className="change-mgmt-wrapper">
        <div className="change-mgmt-track" role="tablist" aria-label="Order Lifecycle Stages">
          {stages.map((stage) => {
            const isActive = selectedStage === stage;
            return (
              <button
                key={stage}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`change-mgmt-step ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setSelectedStage(stage);
                  if (location.pathname === '/order/create-lead') {
                    setSubStage(stage.toLowerCase());
                  } else {
                    const stageSlug = stage.toLowerCase().replace(/\s+/g, '-');
                    const activeDef = getActiveDefinition() || 'sample';
                    navigate(`/order/${activeDef}/${stageSlug}`);
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

  const handleBackToOrder = () => {
    const from = searchParams.get('from');
    if (from) {
      navigate(from);
    } else if (orderStage) {
      const target = subStage ? subStage.replace(/\s+/g, '-') : 'order';
      navigate(`/order/${orderStage}/${target}`);
    } else {
      navigate(-1);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const phone = (formData.phoneNumber || '').trim();
    if (!/^\d{10}$/.test(phone)) {
      setPhoneTouched(true);
      alert('Phone number must be of 10 digits.');
      return;
    }
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
        const from = searchParams.get('from');
        if (from) {
          navigate(from);
        } else if (orderStage) {
          const target = !subStage || subStage === 'new' || subStage === 'leads' ? 'order' : subStage.replace(/\s+/g, '-');
          navigate(`/order/${orderStage}/${target}`);
        } else {
          navigate('/order/sample/order');
        }
      } catch (err) {
        console.error('Error saving lead:', err);
        alert('Failed to save lead: ' + (err.response?.data?.message || err.message));
      }
    } else if (action === 'submit') {
      setIsSubmitted(true);
      if (!formData.orderId) {
        let maxNumber = 0;
        leadsList.forEach((l) => {
          if (l.orderId) {
            const match = l.orderId.match(/^ORD(\d+)$/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
              }
            }
          }
        });
        const generatedId = `ORD${String(maxNumber + 1).padStart(5, '0')}`;
        setFormData((prev) => ({
          ...prev,
          orderId: prev.orderId || generatedId,
        }));
        api.get('/api/leads/next-order-id')
          .then((res) => {
            if (res.data?.nextOrderId) {
              setFormData((prev) => ({
                ...prev,
                orderId: res.data.nextOrderId,
              }));
            }
          })
          .catch(() => {});
      }
    }
  };

  const handleOrderSubmit = async () => {
    const phone = (formData.phoneNumber || '').trim();
    if (!/^\d{10}$/.test(phone)) {
      setPhoneTouched(true);
      alert('Phone number must be of 10 digits.');
      return;
    }

    const totalQty = Number(formData.totalQuantity);
    if (!formData.totalQuantity || isNaN(totalQty) || totalQty <= 0) {
      alert('Please enter a valid Total Quantity (pcs).');
      return;
    }

    if (items.length > 0) {
      if (itemsTotalQty > totalQty) {
        alert(`Validation Error: Total quantity in "Add Item" (${itemsTotalQty} pcs) cannot be greater than Total Quantity (${totalQty} pcs). Sum of items must equal Total Quantity (${totalQty} === ${totalQty}).`);
        return;
      }
      if (itemsTotalQty !== totalQty) {
        alert(`Validation Error: Total quantity in "Add Item" (${itemsTotalQty} pcs) must equal Total Quantity (${totalQty} pcs). (${totalQty} === ${itemsTotalQty})`);
        return;
      }
    }
    try {
      let finalOrderId = formData.orderId;
      if (!finalOrderId) {
        try {
          const idRes = await api.get('/api/leads/next-order-id');
          if (idRes.data?.nextOrderId) finalOrderId = idRes.data.nextOrderId;
        } catch (_) {}
      }
      const payload = {
        employeeName: 'Divyanshi',
        query: 'order',
        queryStatus,
        orderStage,
        subStage,
        ...formData,
        orderId: finalOrderId || formData.orderId,
        items,
        approvalStatus: 'Pending',
      };
      if (editId) payload._id = editId;
      const res = await api.post('/api/leads', payload);
      alert('Order submitted successfully!\nSent to Stock Room Manager and Production Room Manager for approval in the Approval side menu.');
      if (editId && res.data?.data) {
        setOrderApprovalData(res.data.data);
      }
      setIsSubmitted(false);
      setItems([]);
      setQuery('lead');
      setQueryStatus('');
      setOrderStage('');
      setSubStage('');
      setPhoneTouched(false);
      if (formRef.current) formRef.current.reset();

      const from = searchParams.get('from');
      if (from) {
        navigate(from);
      } else if (orderStage && subStage) {
        const target = subStage === 'new' || subStage === 'leads' ? 'order' : subStage.replace(/\s+/g, '-');
        navigate(`/order/${orderStage}/${target}`);
      } else {
        navigate('/order/sample/order');
      }
    } catch (err) {
      console.error('Error submitting order:', err);
      alert('Failed to submit order: ' + (err.response?.data?.message || err.message));
    }
  };

  const isTshirt = (it) => {
    if (it.itemType === 't-shirt') return true;
    if (it.itemType === 'others') return false;
    const t = (it.item || '').toLowerCase().trim();
    return ['t-shirt', 't shirt', 'tshirt'].includes(t);
  };

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), itemType: '', item: '', enterItem: '', fabric: '', quantity: '', size: '', color: '', printingType: '', sublimationOption: '' }]);
  };

  const handleItemChange = (id, fieldOrUpdates, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        if (typeof fieldOrUpdates === 'object') {
          return { ...item, ...fieldOrUpdates };
        }
        return { ...item, [fieldOrUpdates]: value };
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
      currentSubStage = 'order';
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
      return itemSub === 'order' || (item.query === 'order' && (!itemSub || itemSub === 'new')) || !itemSub || itemSub === 'leads' || itemSub === 'new';
    }

    const normItemSub = itemSub.replace(/-/g, ' ');
    const normCurrentSub = currentSubStage.replace(/-/g, ' ');
    return normItemSub === normCurrentSub;
  });

  if (location.pathname === '/order/create-lead') {
    return (
      <div className="dashboard-page">
        {editId ? (
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              onClick={handleBackToOrder}
              className="back-to-order-btn"
            >
              <ArrowLeft size={18} />
              <span>Back to Order</span>
            </button>
          </div>
        ) : (
          <div className="page-header">
            <div>
              <h1>Create Lead</h1>
              <p>Fill out the form below to create a new lead.</p>
            </div>
            <div className="header-actions">
              {/* Save Lead button removed from top header */}
            </div>
          </div>
        )}

        <div className="dashboard-content">
          {/* Definition Bar & Change Management Process Flow (shown only inside orders) */}
          {editId && renderDefinitionBar()}
          {editId && renderChangeManagementBar()}

          {editId && isOrderReferredBack && (
            <div className="referred-back-banner">
              <RotateCcw size={20} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>Action Required: Order Referred Back for Revisions.</strong>
                <div style={{ marginTop: '3px', fontSize: '13px' }}>
                  Please review the manager notes in the clearance tasks below, adjust the required fields in this form, and click <strong>Submit</strong> to send back for approval.
                </div>
              </div>
            </div>
          )}

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
                  <div>
                    <input
                      type="tel"
                      required
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      onBlur={() => setPhoneTouched(true)}
                      placeholder="10-digit mobile number"
                    />
                    {phoneTouched && !/^\d{10}$/.test((formData.phoneNumber || '').trim()) && (
                      <span style={{ color: '#ef4444', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                        Phone number must be of 10 digits
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: 2 }}>
                  <label>Repeated Order</label>
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '14px', margin: 0, color: '#334155' }}>
                      <input
                        type="radio"
                        name="repeatedOrder"
                        value="Yes"
                        checked={formData.repeatedOrder === 'Yes'}
                        onChange={(e) => setFormData({ ...formData, repeatedOrder: e.target.value })}
                        style={{ width: 'auto', margin: 0, cursor: 'pointer', accentColor: '#2563eb' }}
                      />
                      Yes
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '14px', margin: 0, color: '#334155' }}>
                      <input
                        type="radio"
                        name="repeatedOrder"
                        value="No"
                        checked={formData.repeatedOrder === 'No' || !formData.repeatedOrder}
                        onChange={(e) => setFormData({ ...formData, repeatedOrder: e.target.value })}
                        style={{ width: 'auto', margin: 0, cursor: 'pointer', accentColor: '#2563eb' }}
                      />
                      No
                    </label>
                  </div>
                </div>

                {(queryStatus === 'phone not pick' || queryStatus === 'call back') && (
                  <div className="form-group" style={{ gridColumn: 1 }}>
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
              
              {!isSubmitted && !editId && (
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
            {(isSubmitted || !!editId) && (
              <div className="form-section" style={{ marginTop: '24px' }}>
                <div className="form-section-title">Order Information</div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Order ID</label>
                    <input
                      type="text"
                      value={formData.orderId}
                      onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                      placeholder="ORD00001"
                      style={{ background: 'rgba(0,0,0,0.02)', fontWeight: 600, color: '#1e40af' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Paperclip size={15} style={{ color: '#2563eb' }} />
                      <span>Attachment</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleAttachmentChange}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary"
                        style={{
                          padding: '7px 12px',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          borderRadius: '8px',
                          background: 'white',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Upload size={14} />
                        {formData.attachment ? 'Change File' : 'Upload File'}
                      </button>
                      {formData.attachment ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                          <a
                            href={formData.attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={formData.attachmentName || 'logo-artwork'}
                            title={formData.attachmentName}
                            style={{
                              fontSize: '12px',
                              color: '#2563eb',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textDecoration: 'underline',
                              maxWidth: '120px'
                            }}
                          >
                            {formData.attachmentName || 'Attached'}
                          </a>
                          <button
                            type="button"
                            onClick={handleRemoveAttachment}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '0 4px',
                              fontSize: '15px',
                              fontWeight: 'bold',
                              lineHeight: 1
                            }}
                            title="Remove attachment"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          No file chosen
                        </span>
                      )}
                    </div>
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
                    <label>Logo Name</label>
                    <input
                      type="text"
                      value={formData.logoName}
                      onChange={(e) => setFormData({ ...formData, logoName: e.target.value })}
                      placeholder="Enter logo name"
                    />
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
                    <div>
                      <input
                        type="number"
                        required
                        value={formData.totalQuantity}
                        onChange={(e) => setFormData({ ...formData, totalQuantity: e.target.value })}
                        style={{
                          width: '100%',
                          borderColor:
                            items.length > 0 && orderTotalQty > 0
                              ? itemsTotalQty === orderTotalQty
                                ? '#22c55e'
                                : itemsTotalQty > orderTotalQty
                                ? '#ef4444'
                                : '#f59e0b'
                              : undefined,
                        }}
                      />
                      {items.length > 0 && orderTotalQty > 0 && (
                        <div style={{ marginTop: '5px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {itemsTotalQty === orderTotalQty ? (
                            <span style={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={13} /> Matches Add Item total ({itemsTotalQty}/{orderTotalQty} pcs)
                            </span>
                          ) : itemsTotalQty > orderTotalQty ? (
                            <span style={{ color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={13} /> Items total ({itemsTotalQty} pcs) exceeds Total Quantity ({orderTotalQty} pcs). Must equal ({orderTotalQty} === {orderTotalQty}).
                            </span>
                          ) : (
                            <span style={{ color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={13} /> Items total: {itemsTotalQty} / {orderTotalQty} pcs ({orderTotalQty - itemsTotalQty} pcs remaining to match)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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
                    <label>GST (in percentage)</label>
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
                    <label>Urgency *</label>
                    <select
                      required
                      value={formData.urgency}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          urgency: val,
                          ...(val.toLowerCase() !== 'yes' ? { deliveryDate: getDefaultDeliveryDate() } : {})
                        }));
                      }}
                    >
                      <option value="">Select urgency...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Delivery Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                      disabled={formData.urgency?.toLowerCase() !== 'yes'}
                      style={
                        formData.urgency?.toLowerCase() !== 'yes'
                          ? { background: 'rgba(0,0,0,0.03)', cursor: 'not-allowed', color: '#64748b' }
                          : {}
                      }
                      title={formData.urgency?.toLowerCase() !== 'yes' ? "Only editable when Urgency is 'Yes'" : ""}
                    />
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button type="button" onClick={handleAddItem} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={16} /> Add Item
                      </button>
                      {orderTotalQty > 0 && (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: itemsTotalQty === orderTotalQty && itemsTotalQty > 0 ? '#dcfce7' : itemsTotalQty > orderTotalQty ? '#fee2e2' : '#fef3c7',
                          color: itemsTotalQty === orderTotalQty && itemsTotalQty > 0 ? '#15803d' : itemsTotalQty > orderTotalQty ? '#b91c1c' : '#b45309',
                          border: `1px solid ${itemsTotalQty === orderTotalQty && itemsTotalQty > 0 ? '#86efac' : itemsTotalQty > orderTotalQty ? '#fca5a5' : '#fde68a'}`
                        }}>
                          Items Total: {itemsTotalQty} / {orderTotalQty} pcs {itemsTotalQty === orderTotalQty && itemsTotalQty > 0 ? '✓' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {items.length > 0 && (
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '10px',
                            padding: '14px 16px',
                            background: '#f8fafc',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            flexWrap: 'nowrap',
                            width: '100%',
                            boxSizing: 'border-box',
                            overflowX: 'auto',
                          }}
                        >
                          <div style={{ flex: '1.1 1 115px', minWidth: '105px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Item *</label>
                            <select
                              required
                              value={item.itemType || (isTshirt(item) ? 't-shirt' : (item.item ? 'others' : ''))}
                              onChange={(e) => {
                                const selected = e.target.value;
                                if (selected === 't-shirt') {
                                  handleItemChange(item.id, {
                                    itemType: 't-shirt',
                                    item: 'T-Shirt',
                                  });
                                } else if (selected === 'others') {
                                  handleItemChange(item.id, {
                                    itemType: 'others',
                                    item: item.enterItem || '',
                                    printingType: '',
                                    sublimationOption: '',
                                  });
                                } else {
                                  handleItemChange(item.id, {
                                    itemType: '',
                                    item: '',
                                    printingType: '',
                                    sublimationOption: '',
                                  });
                                }
                              }}
                              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                            >
                              <option value="">Select...</option>
                              <option value="t-shirt">T-Shirt</option>
                              <option value="others">Others</option>
                            </select>
                          </div>

                          {(item.itemType === 'others' || (!isTshirt(item) && item.item && item.item !== '')) && (
                            <div style={{ flex: '1.2 1 120px', minWidth: '105px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Enter Item *</label>
                              <input
                                type="text"
                                required
                                placeholder="Enter item..."
                                value={item.enterItem || (item.item !== 'T-Shirt' && item.item !== 'others' ? item.item : '')}
                                onChange={(e) => handleItemChange(item.id, {
                                  enterItem: e.target.value,
                                  item: e.target.value,
                                })}
                                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                              />
                            </div>
                          )}

                          {isTshirt(item) && (
                            <div style={{ flex: '1.2 1 125px', minWidth: '115px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Printing Type</label>
                              <select
                                value={item.printingType || ''}
                                onChange={(e) => handleItemChange(item.id, 'printingType', e.target.value)}
                                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                              >
                                <option value="">Select...</option>
                                <option value="DTF">DTF</option>
                                <option value="Sublimation">Sublimation</option>
                                <option value="Embroidery">Embroidery</option>
                              </select>
                            </div>
                          )}

                          {isTshirt(item) && (item.printingType || '') === 'Sublimation' && (
                            <div style={{ flex: '0.8 1 80px', minWidth: '75px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Option</label>
                              <select
                                value={item.sublimationOption || ''}
                                onChange={(e) => handleItemChange(item.id, 'sublimationOption', e.target.value)}
                                style={{ padding: '8px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                              >
                                <option value="">Select...</option>
                                <option value="1/2">1/2</option>
                                <option value="1">1</option>
                              </select>
                            </div>
                          )}

                          <div style={{ flex: '1 1 95px', minWidth: '85px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Fabric *</label>
                            <input
                              type="text"
                              required
                              value={item.fabric || ''}
                              onChange={(e) => handleItemChange(item.id, 'fabric', e.target.value)}
                              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div style={{ flex: '0.8 1 70px', minWidth: '60px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Quantity *</label>
                            <input
                              type="number"
                              required
                              value={item.quantity || ''}
                              onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div style={{ flex: '0.8 1 75px', minWidth: '65px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Size *</label>
                            <select
                              required
                              value={item.size || ''}
                              onChange={(e) => handleItemChange(item.id, 'size', e.target.value)}
                              style={{ padding: '8px 6px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                            >
                              <option value="">Select...</option>
                              <option value="S">S</option>
                              <option value="M">M</option>
                              <option value="L">L</option>
                              <option value="XL">XL</option>
                              <option value="XXL">XXL</option>
                              <option value="XXXL">XXXL</option>
                              {item.size && !['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(item.size) && (
                                <option value={item.size}>{item.size}</option>
                              )}
                            </select>
                          </div>
                          <div style={{ flex: '1 1 95px', minWidth: '85px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Color *</label>
                            <input
                              type="text"
                              required
                              value={item.color || ''}
                              onChange={(e) => handleItemChange(item.id, 'color', e.target.value)}
                              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            title="Remove item"
                            style={{
                              flex: '0 0 auto',
                              height: '36px',
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: '1px',
                              borderRadius: '6px',
                            }}
                          >
                            <Trash2 size={18} />
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

          {/* TASK SECTION AFTER THE FORM IN ORDERS (Only in orders of sample, partial, and complete) */}
          {Boolean(editId) && (
            <div className="order-tasks-wrapper">
              <div className="tasks-section-header">
                <div className="tasks-section-title">Department Clearance Tasks</div>
                <p className="tasks-section-subtitle">
                  Review status and feedback from Stock Room Manager and Production Room Manager
                </p>
              </div>

              {/* Task 1 - Stock Room */}
              <div className="order-task-card">
                <div className="task-col-left">
                  <div className="task-title">Task 1 - Stock Room</div>
                  <div className="task-manager-subtitle">Elena Rostova (Stock Room Manager)</div>
                </div>

                <div className="task-col-center">
                  <span className="task-status-label">Status</span>
                  <span
                    className={`task-status-pill ${
                      stockAppr.status === 'Approved'
                        ? 'approved'
                        : stockAppr.status === 'Referred Back'
                        ? 'referred'
                        : 'pending'
                    }`}
                  >
                    {stockAppr.status || 'Pending'}
                  </span>
                </div>

                <div className="task-col-right">
                  <span className="task-note-label">Stock Room Notes</span>
                  {stockAppr.note ? (
                    <div
                      className={`task-note-content ${
                        stockAppr.status === 'Referred Back' ? 'referred' : ''
                      }`}
                    >
                      {stockAppr.note}
                    </div>
                  ) : (
                    <div className="task-note-placeholder">
                      {stockAppr.status === 'Approved'
                        ? 'Approved by Stock Room'
                        : 'Awaiting Review'}
                    </div>
                  )}
                </div>
              </div>

              {/* Task 2 - Production Room */}
              <div className="order-task-card">
                <div className="task-col-left">
                  <div className="task-title">Task 2 - Production Room</div>
                  <div className="task-manager-subtitle">Marcus Vance (Production Lead)</div>
                </div>

                <div className="task-col-center">
                  <span className="task-status-label">Status</span>
                  <span
                    className={`task-status-pill ${
                      prodAppr.status === 'Approved'
                        ? 'approved'
                        : prodAppr.status === 'Referred Back'
                        ? 'referred'
                        : 'pending'
                    }`}
                  >
                    {prodAppr.status || 'Pending'}
                  </span>
                </div>

                <div className="task-col-right">
                  <span className="task-note-label">Production Notes</span>
                  {prodAppr.note ? (
                    <div
                      className={`task-note-content ${
                        prodAppr.status === 'Referred Back' ? 'referred' : ''
                      }`}
                    >
                      {prodAppr.note}
                    </div>
                  ) : (
                    <div className="task-note-placeholder">
                      {prodAppr.status === 'Approved'
                        ? 'Approved by Production'
                        : 'Awaiting Review'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
                  <th style={{ padding: '10px 12px' }}>Clearance Status</th>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {matchingLeads.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => navigate(`/order/create-lead?id=${item._id}&from=${encodeURIComponent(location.pathname)}&stage=${encodeURIComponent(item.orderStage || 'sample')}`)}
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
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          backgroundColor:
                            (item.approvalStatus || 'Pending') === 'Approved'
                              ? '#d1fae5'
                              : (item.approvalStatus || 'Pending') === 'Referred Back'
                              ? '#fee2e2'
                              : '#fef3c7',
                          color:
                            (item.approvalStatus || 'Pending') === 'Approved'
                              ? '#065f46'
                              : (item.approvalStatus || 'Pending') === 'Referred Back'
                              ? '#b91c1c'
                              : '#b45309',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor:
                              (item.approvalStatus || 'Pending') === 'Approved'
                                ? '#059669'
                                : (item.approvalStatus || 'Pending') === 'Referred Back'
                                ? '#dc2626'
                                : '#d97706',
                          }}
                        />
                        {item.approvalStatus || 'Pending'}
                      </span>
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
