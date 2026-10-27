import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Plus, Trash2, ArrowLeft, RotateCcw, AlertCircle, CheckCircle2, Paperclip, Upload, FileText, Check, ShieldCheck, CheckCircle, Clock } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
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
  'Ready to Pick Up',
  'Staging Ground',
  'Customer Approval Awaiting'
];

const PARTIAL_STAGES = [
  'Order',
  'DTF Pending',
  'Stock',
  'Printing',
  'Quality Check',
  'Packaging',
  'Staging Room',
  'Payment Confirmation'
];

const COMPLETE_STAGES = [
  'Order',
  'DTF Pending',
  'Stock',
  'Printing',
  'Quality Check',
  'Packaging',
  'Delivery Pending',
  'Delivered',
  'Customer Support'
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
    'Ready to Pick Up',
    'Staging Ground',
    'Customer Approval Awaiting'
  ],
  partial: [
    'Order',
    'DTF Pending',
    'Stock',
    'Printing',
    'Quality Check',
    'Packaging',
    'Staging Room',
    'Payment Confirmation'
  ],
  complete: [
    'Order',
    'DTF Pending',
    'Stock',
    'Printing',
    'Quality Check',
    'Packaging',
    'Delivery Pending',
    'Delivered',
    'Customer Support'
  ]
};

const MAJOR_STAGES_ORDER = ['sample', 'partial', 'complete'];

const getLeadStageInfo = (item, targetStage, targetSubStage) => {
  const normTargetStage = (targetStage || '').toLowerCase().trim();
  const normTargetSub = (targetSubStage || '').toLowerCase().trim().replace(/\s+/g, '-');
  
  const rawItemStage = (item.orderStage || 'sample').toLowerCase().trim();
  const itemStage = ['sample', 'partial', 'complete'].includes(rawItemStage) ? rawItemStage : 'sample';

  const rawItemSub = (item.subStage || 'order').toLowerCase().trim();
  let itemSub = rawItemSub.replace(/\s+/g, '-');
  if (itemSub === 'new' || itemSub === 'leads' || !itemSub) {
    itemSub = 'order';
  } else if (itemSub === 'dtf' || itemSub === 'dtf-pending-workspace') {
    itemSub = 'dtf-pending';
  }

  // 1. Dedicated handling for Customer Support (/order/customer-support or /order/complete/customer-support)
  if (normTargetSub === 'customer-support') {
    const isAtSupport = itemStage === 'complete' && itemSub === 'customer-support';
    if (!isAtSupport) return { matches: false, status: 'none', isCompleted: false };
    const isApproved = Boolean(
      item.isCompleted ||
      item.approvalStatus === 'Completed' ||
      item.completeCustomerSupportData?.clientRating ||
      item.completeCustomerSupportData?.orderFulfilled
    );
    return { matches: true, status: isApproved ? 'approved' : 'in_progress', isCompleted: isApproved };
  }

  // If viewing Leads tab
  if (normTargetSub === 'leads' || normTargetSub === 'new') {
    const isLead = itemSub === 'leads' || itemSub === 'new' || item.query === 'lead';
    return { matches: isLead, status: 'in_progress', isCompleted: false };
  }

  // If no target stage specified, match all
  if (!normTargetStage) {
    return { matches: true, status: 'in_progress', isCompleted: false };
  }

  // 2. Strict Stage & Sub-Stage matching: only show order in its exact current stage and sub-stage
  const stageMatches = itemStage === normTargetStage;
  const subStageMatches = itemSub === normTargetSub;

  if (!stageMatches || !subStageMatches) {
    return { matches: false, status: 'none', isCompleted: false };
  }

  // 3. Determine status ('approved' vs 'in_progress') within this stage/sub-stage
  let isApprovedAtThisStage = false;

  if (normTargetStage === 'sample') {
    if (normTargetSub === 'order') {
      isApprovedAtThisStage = item.leadApproval?.status === 'Approved' || item.approvalStatus === 'Approved';
    } else if (normTargetSub === 'dtf-pending') {
      isApprovedAtThisStage = item.productionApproval?.status === 'Approved';
    } else if (normTargetSub === 'stock') {
      isApprovedAtThisStage = item.stockApproval?.status === 'Approved';
    } else if (normTargetSub === 'printing') {
      isApprovedAtThisStage = item.printingStageData?.printingStatus === 'Complete';
    } else if (normTargetSub === 'ready-to-pick-up') {
      isApprovedAtThisStage = Boolean(item.sampleReadyToPickUpData?.verifiedPickupCount || item.sampleReadyToPickUpData?.readyToPickupCount);
    } else if (normTargetSub === 'staging-ground') {
      isApprovedAtThisStage = Boolean(item.sampleStagingGroundData?.orderRequirementMatch);
    } else if (normTargetSub === 'customer-approval-awaiting') {
      isApprovedAtThisStage = Boolean(item.customerApprovalData?.customerApproved);
    }
  } else if (normTargetStage === 'partial') {
    if (normTargetSub === 'order') {
      isApprovedAtThisStage = item.approvalStatus === 'Approved';
    } else if (normTargetSub === 'printing') {
      isApprovedAtThisStage = item.partialPrintingData?.printingStatus === 'Complete';
    } else if (normTargetSub === 'quality-check') {
      isApprovedAtThisStage = Boolean(item.partialQualityCheckData?.passedCount);
    } else if (normTargetSub === 'packaging') {
      isApprovedAtThisStage = Boolean(item.partialPackagingData?.packedCount);
    } else if (normTargetSub === 'staging-room') {
      isApprovedAtThisStage = Boolean(item.partialStagingRoomData?.dispatchReady);
    } else if (normTargetSub === 'payment-confirmation') {
      isApprovedAtThisStage = Boolean(item.partialPaymentConfirmationData?.paymentVerified);
    }
  } else if (normTargetStage === 'complete') {
    if (normTargetSub === 'order') {
      isApprovedAtThisStage = item.approvalStatus === 'Approved';
    } else if (normTargetSub === 'printing') {
      isApprovedAtThisStage = item.completePrintingData?.printingStatus === 'Complete';
    } else if (normTargetSub === 'quality-check') {
      isApprovedAtThisStage = Boolean(item.completeQualityCheckData?.passedCount);
    } else if (normTargetSub === 'packaging') {
      isApprovedAtThisStage = Boolean(item.completePackagingData?.totalUnitsPacked);
    } else if (normTargetSub === 'delivery-pending') {
      isApprovedAtThisStage = Boolean(item.completeDeliveryPendingData?.trackingNumber);
    } else if (normTargetSub === 'delivered') {
      isApprovedAtThisStage = Boolean(item.completeDeliveredData?.deliveredDate);
    } else if (normTargetSub === 'customer-support') {
      isApprovedAtThisStage = Boolean(item.completeCustomerSupportData?.clientRating || item.isCompleted || item.approvalStatus === 'Completed');
    }
  }

  return {
    matches: true,
    status: isApprovedAtThisStage ? 'approved' : 'in_progress',
    isCompleted: isApprovedAtThisStage,
  };
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
  '/order/customer-support': 'Customer Support',

  // Sample child routes
  '/order/sample': 'Order',
  '/order/sample/leads': 'Order',
  '/order/sample/order': 'Order',
  '/order/sample/dtf-pending': 'DTF Pending',
  '/order/sample/stock': 'Stock',
  '/order/sample/printing': 'Printing',
  '/order/sample/ready-to-pick-up': 'Ready to Pick Up',
  '/order/sample/staging-ground': 'Staging Ground',
  '/order/sample/customer-approval-awaiting': 'Customer Approval Awaiting',

  // Partial child routes
  '/order/partial': 'Order',
  '/order/partial/leads': 'Order',
  '/order/partial/order': 'Order',
  '/order/partial/dtf-pending': 'DTF Pending',
  '/order/partial/stock': 'Stock',
  '/order/partial/printing': 'Printing',
  '/order/partial/quality-check': 'Quality Check',
  '/order/partial/packaging': 'Packaging',
  '/order/partial/staging-room': 'Staging Room',
  '/order/partial/payment-confirmation': 'Payment Confirmation',

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
  '/order/complete/delivered': 'Delivered',
  '/order/complete/customer-support': 'Customer Support',
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
  const { currentUser } = useAuth();
  const isSales = currentUser?.role === 'Sales Executive' || currentUser?.id?.startsWith('sales');
  const isLeadManager =
    currentUser?.id === 'lead_manager' ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase() === 'lead manager');
  const isLeadManagerOrAdmin = isLeadManager || currentUser?.id === 'admin';
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const [leadManagerNote, setLeadManagerNote] = useState('');
  const [submittingLeadAction, setSubmittingLeadAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

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

  const [stageForm, setStageForm] = useState({
    // Sample
    stageStatus: 'Work in Progress',
    receivedCount: 5,
    readyToPickupCount: 5,
    orderRequirementMatch: true,
    customerApproved: true,
    customerRequirementsMatch: true,
    paymentStatus: 'half',
    amountPaid: '',
    
    // Partial
    partialPrintingStatus: 'Complete',
    partialPrintedCount: 0,
    partialQcPassedCount: 80,
    partialQcRejectedCount: 0,
    partialPackedCount: 80,
    partialCartonCount: 2,
    partialStagingRack: 'Rack P-04',
    partialInvoiceNo: 'INV-PART-01',
    partialPaymentMode: 'Bank Transfer',
    partialAmountReceived: 50000,
    partialBalanceRemaining: 0,
    
    // Complete
    completePrintingStatus: 'Complete',
    completePrintedCount: 100,
    completeQcPassedCount: 100,
    completeQcRejectedCount: 0,
    completeMasterCartonsCount: 4,
    completeUnitsPacked: 100,
    completeCourierName: 'Blue Dart Express',
    completeTrackingNumber: 'AWB-BD-882319',
    completeDispatchDate: new Date().toISOString().split('T')[0],
    completeDriverPhone: '+91 98765 43210',
    completeDeliveryDate: new Date().toISOString().split('T')[0],
    completeReceivedBy: 'Store Manager',
    completeRecipientPhone: '+91 98110 00000',
    completePodNumber: 'POD-99214',
    completeClientRating: 5,
    completeSupportResolution: 'Delivered & Client Fully Satisfied',
    completeClientFeedback: 'Sample and bulk garments matched our exact specifications. Excellent delivery!',

    note: '',
  });
  const [submittingStageAction, setSubmittingStageAction] = useState(false);
  const [stageFilterTab, setStageFilterTab] = useState('all'); // 'all' | 'pending' | 'approved'

  useEffect(() => {
    setStageFilterTab('all');
  }, [location.pathname]);

  const fetchAllLeads = () => {
    api.get('/api/leads')
      .then((res) => {
        if (res.data?.data) {
          setLeadsList(res.data.data);
        }
      })
      .catch((err) => console.error('Error fetching leads:', err));
  };

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

  const getLeadApproval = () => {
    if (orderApprovalData?.leadApproval?.status) {
      return orderApprovalData.leadApproval;
    }
    const comments = orderApprovalData?.approvalComments || [];
    const leadComment = [...comments].reverse().find(c =>
      (c.role && c.role.toLowerCase().includes('lead manager')) ||
      (c.author && c.author.toLowerCase().includes('sarah')) ||
      (c.comment && c.comment.toLowerCase().includes('lead manager'))
    );
    if (leadComment) {
      return {
        status: leadComment.status || 'Pending',
        note: leadComment.comment || '',
        author: leadComment.author || 'Sarah Jenkins',
        updatedAt: leadComment.createdAt,
      };
    }
    return {
      status: orderApprovalData?.approvalStatus === 'Referred Back' ? 'Referred Back' : (orderApprovalData?.approvalStatus || 'Pending'),
      note: '',
      author: 'Sarah Jenkins',
      updatedAt: null,
    };
  };

  const getStockApproval = () => {
    const stock = orderApprovalData?.stockApproval;
    if (
      stock &&
      stock.status &&
      stock.note !== 'Approved by Lead Manager' &&
      !stock.note?.toLowerCase().includes('approved by lead manager') &&
      stock.author !== 'Sarah Jenkins'
    ) {
      return stock;
    }
    const comments = orderApprovalData?.approvalComments || [];
    const stockComment = [...comments].reverse().find(c =>
      ((c.role && c.role.toLowerCase().includes('stock')) ||
      (c.author && c.author.toLowerCase().includes('elena'))) &&
      !c.role?.toLowerCase().includes('lead manager') &&
      !c.comment?.toLowerCase().includes('approved by lead manager')
    );
    if (stockComment) {
      return {
        status: stockComment.status || 'Pending',
        note: stockComment.comment || '',
        author: stockComment.author || 'Elena Rostova',
      };
    }
    return {
      status: 'Pending',
      note: '',
      author: 'Elena Rostova',
    };
  };

  const getProductionApproval = () => {
    const prod = orderApprovalData?.productionApproval;
    if (
      prod &&
      prod.status &&
      prod.note !== 'Approved by Lead Manager' &&
      !prod.note?.toLowerCase().includes('approved by lead manager') &&
      prod.author !== 'Sarah Jenkins'
    ) {
      return prod;
    }
    const comments = orderApprovalData?.approvalComments || [];
    const prodComment = [...comments].reverse().find(c =>
      ((c.role && c.role.toLowerCase().includes('production')) ||
      (c.author && c.author.toLowerCase().includes('marcus'))) &&
      !c.role?.toLowerCase().includes('lead manager') &&
      !c.comment?.toLowerCase().includes('approved by lead manager')
    );
    if (prodComment) {
      return {
        status: prodComment.status || 'Pending',
        note: prodComment.comment || '',
        author: prodComment.author || 'Marcus Vance',
      };
    }
    return {
      status: 'Pending',
      note: '',
      author: 'Marcus Vance',
    };
  };

  const leadAppr = getLeadApproval();
  const stockAppr = getStockApproval();
  const prodAppr = getProductionApproval();
  const isLeadSubmitted = leadAppr.status === 'Approved';
  const isOrderReferredBack =
    orderApprovalData?.approvalStatus === 'Referred Back' ||
    leadAppr.status === 'Referred Back' ||
    stockAppr.status === 'Referred Back' ||
    prodAppr.status === 'Referred Back';

  const handleLeadManagerAction = async (status) => {
    if (!editId || submittingLeadAction) return;
    if (status === 'Approved' && isLeadSubmitted) return;

    if (status === 'Referred Back' && !leadManagerNote.trim()) {
      alert('Additional note is mandatory with every refer back. Please enter instructions or changes required for the sales executive.');
      return;
    }

    setSubmittingLeadAction(true);
    setActionSuccessMsg('');
    try {
      const payload = {
        status,
        department: 'lead_manager',
        role: 'Lead Manager',
        author: currentUser?.name || 'Sarah Jenkins',
        comment: leadManagerNote.trim() || (status === 'Approved' ? (currentUser?.id === 'admin' ? 'Submitted by CEO' : 'Submitted by Lead Manager') : 'Referred back by Lead Manager'),
      };

      const res = await api.patch(`/api/leads/${editId}/approval`, payload);
      if (res.data?.success) {
        setOrderApprovalData(res.data.data);
        const msg = status === 'Approved'
          ? `Order #${res.data.data?.orderId || 'Order'} submitted successfully! Sent to Stock Room and Production Room managers.`
          : `Order #${res.data.data?.orderId || 'Order'} referred back to sales executive with mandatory correction note.`;
        setActionSuccessMsg(msg);
        setLeadManagerNote('');
        setTimeout(() => setActionSuccessMsg(''), 6000);
      }
    } catch (err) {
      console.error('Error submitting lead approval:', err);
      alert(err.response?.data?.message || 'Failed to update lead approval status.');
    } finally {
      setSubmittingLeadAction(false);
    }
  };

  // Load pre-filled data when an id is in the URL
  useEffect(() => {
    if (location.pathname === '/order/create-lead') {
      if (editId) {
        api.get(`/api/leads/${editId}`)
          .then((res) => {
            if (res.data?.data) {
              const d = res.data.data;
              setOrderApprovalData(d);
              const sampleCount = d.stockTaskData?.sampleDeduction || d.productionTaskData?.sampleLogosCount || 5;
              const totalQty = d.totalQuantity || 100;
              const fromUrl = searchParams.get('from') || '';
              let stageNote = '';
              if (fromUrl.includes('/customer-approval-awaiting')) {
                stageNote = d.customerApprovalData?.note || d.sampleStagingGroundData?.note || '';
              } else if (fromUrl.includes('/staging-ground')) {
                stageNote = d.sampleStagingGroundData?.note || d.sampleReadyToPickUpData?.note || '';
              } else if (fromUrl.includes('/ready-to-pick-up')) {
                stageNote = d.sampleReadyToPickUpData?.note || d.printingStageData?.note || '';
              } else if (fromUrl.includes('/partial/payment-confirmation') || fromUrl.includes('/payment-confirmation')) {
                stageNote = d.partialPaymentConfirmationData?.note || d.partialStagingRoomData?.note || '';
              } else if (fromUrl.includes('/partial/staging-room')) {
                stageNote = d.partialStagingRoomData?.note || d.partialPackagingData?.note || '';
              } else if (fromUrl.includes('/partial/packaging') || (fromUrl.includes('/packaging') && fromUrl.includes('/partial'))) {
                stageNote = d.partialPackagingData?.note || d.partialQualityCheckData?.note || '';
              } else if (fromUrl.includes('/partial/quality-check') || (fromUrl.includes('/quality-check') && fromUrl.includes('/partial'))) {
                stageNote = d.partialQualityCheckData?.note || d.partialPrintingData?.note || '';
              } else if (fromUrl.includes('/partial/printing') || (fromUrl.includes('/printing') && fromUrl.includes('/partial'))) {
                stageNote = d.partialPrintingData?.note || '';
              } else if (fromUrl.includes('/complete/customer-support')) {
                stageNote = d.completeCustomerSupportData?.note || d.completeDeliveredData?.note || '';
              } else if (fromUrl.includes('/complete/delivered')) {
                stageNote = d.completeDeliveredData?.note || d.completeDeliveryPendingData?.note || '';
              } else if (fromUrl.includes('/complete/delivery-pending')) {
                stageNote = d.completeDeliveryPendingData?.note || d.completePackagingData?.note || '';
              } else if (fromUrl.includes('/complete/packaging')) {
                stageNote = d.completePackagingData?.note || d.completeQualityCheckData?.note || '';
              } else if (fromUrl.includes('/complete/quality-check')) {
                stageNote = d.completeQualityCheckData?.note || d.completePrintingData?.note || '';
              } else if (fromUrl.includes('/complete/printing')) {
                stageNote = d.completePrintingData?.note || '';
              } else {
                stageNote = d.printingStageData?.note || '';
              }

              const partialDefaultQty = totalQty || 18;

              setStageForm({
                // Sample
                stageStatus: d.printingStageData?.printingStatus || 'Work in Progress',
                receivedCount: d.printingStageData?.receivedCount || d.stockTaskData?.receivedCount || sampleCount,
                readyToPickupCount: d.sampleReadyToPickUpData?.readyToPickupCount || d.sampleReadyToPickUpData?.verifiedPickupCount || d.printingStageData?.readyToPickupCount || sampleCount,
                orderRequirementMatch: d.sampleStagingGroundData?.orderRequirementMatch !== false,
                customerApproved: d.customerApprovalData?.customerApproved !== false,
                customerRequirementsMatch: d.customerApprovalData?.customerRequirementsMatch !== false,
                paymentStatus: d.customerApprovalData?.paymentStatus || 'half',
                amountPaid: d.customerApprovalData?.amountPaid || d.advanceAmount || '',

                // Partial
                partialPrintingStatus: d.partialPrintingData?.printingStatus || 'Complete',
                partialPrintedCount: d.partialPrintingData?.printedCount !== undefined ? d.partialPrintingData.printedCount : partialDefaultQty,
                partialQcPassedCount: d.partialQualityCheckData?.passedCount || partialDefaultQty,
                partialQcRejectedCount: d.partialQualityCheckData?.rejectedCount || 0,
                partialPackedCount: d.partialPackagingData?.packedCount || partialDefaultQty,
                partialCartonCount: d.partialPackagingData?.cartonCount || 2,
                partialStagingRack: d.partialStagingRoomData?.stagedRackNumber || 'Rack P-04',
                partialInvoiceNo: d.partialPaymentConfirmationData?.invoiceNumber || (d.orderId ? `INV-${d.orderId}-P1` : 'INV-PART-01'),
                partialPaymentMode: d.partialPaymentConfirmationData?.paymentMode || 'Bank Transfer',
                partialAmountReceived: d.partialPaymentConfirmationData?.amountReceived || Math.round((d.netAmount || 50000) * 0.5),
                partialBalanceRemaining: d.partialPaymentConfirmationData?.balancePending || Math.round((d.netAmount || 50000) * 0.5),

                // Complete
                completePrintingStatus: d.completePrintingData?.printingStatus || 'Complete',
                completePrintedCount: d.completePrintingData?.printedCount !== undefined ? d.completePrintingData.printedCount : (d.totalQuantity || totalQty),
                completeQcPassedCount: d.completeQualityCheckData?.passedCount || totalQty,
                completeQcRejectedCount: d.completeQualityCheckData?.rejectedCount || 0,
                completeMasterCartonsCount: d.completePackagingData?.masterCartonsCount || 4,
                completeUnitsPacked: d.completePackagingData?.totalUnitsPacked || totalQty,
                completeCourierName: d.completeDeliveryPendingData?.courierName || 'Blue Dart Express',
                completeTrackingNumber: d.completeDeliveryPendingData?.trackingNumber || (d.orderId ? `AWB-BD-${d.orderId}` : 'AWB-BD-882319'),
                completeDispatchDate: d.completeDeliveryPendingData?.dispatchDate || new Date().toISOString().split('T')[0],
                completeDriverPhone: d.completeDeliveryPendingData?.driverPhone || '+91 98765 43210',
                completeDeliveryDate: d.completeDeliveredData?.deliveredDate || new Date().toISOString().split('T')[0],
                completeReceivedBy: d.completeDeliveredData?.receivedBy || d.clientName || 'Store Manager',
                completeRecipientPhone: d.completeDeliveredData?.recipientContact || d.phoneNumber || '+91 98110 00000',
                completePodNumber: d.completeDeliveredData?.podNumber || (d.orderId ? `POD-${d.orderId}` : 'POD-99214'),
                completeClientRating: d.completeCustomerSupportData?.clientRating || 5,
                completeSupportResolution: d.completeCustomerSupportData?.supportResolutionStatus || 'Delivered & Client Fully Satisfied',
                completeClientFeedback: d.completeCustomerSupportData?.feedbackNotes || 'Sample and bulk garments matched our exact specifications. Excellent delivery!',

                note: stageNote,
              });
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
    if (orderApprovalData?.orderStage) {
      const os = orderApprovalData.orderStage.toLowerCase().trim();
      if (['sample', 'partial', 'complete'].includes(os)) return os;
    }
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
    if (location.pathname.startsWith('/order/sample')) return 'sample';
    if (location.pathname.startsWith('/order/partial')) return 'partial';
    if (location.pathname.startsWith('/order/complete')) return 'complete';
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
      const currentSub = (orderApprovalData?.subStage || subStage || '').toLowerCase().replace(/\s+/g, '-');
      if (currentSub) {
        const matched = activeStages.find(s => s.toLowerCase().replace(/\s+/g, '-') === currentSub);
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
  }, [location.pathname, editId, subStage, orderStage, orderApprovalData?.subStage, orderApprovalData?.orderStage]);

  const renderDefinitionBar = () => {
    const currentDefinition = getActiveDefinition();
    if (!currentDefinition) return null;

    return (
      <div className="change-mgmt-wrapper definition-bar-wrapper">
        <div className="change-mgmt-track" role="tablist" aria-label="Definition Bar">
          {ORDER_DEFINITIONS.map((def) => {
            const isActive = currentDefinition === def.slug;
            return (
              <div
                key={def.slug}
                role="tab"
                aria-selected={isActive}
                className={`change-mgmt-step definition-step is-static ${isActive ? 'active' : ''}`}
                style={{ cursor: 'default', pointerEvents: 'none' }}
                title={`Definition: ${def.label}`}
              >
                <span className="step-label">{def.label}</span>
              </div>
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
              <div
                key={stage}
                role="tab"
                aria-selected={isActive}
                className={`change-mgmt-step is-static ${isActive ? 'active' : ''}`}
                style={{ cursor: 'default', pointerEvents: 'none' }}
                title={`Stage: ${stage}`}
              >
                <span className="step-label">{stage}</span>
              </div>
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
    } else if (subStage === 'customer-support') {
      navigate('/order/customer-support');
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
        const currentEmpName = formData.employeeName || (editId && orderApprovalData?.employeeName ? orderApprovalData.employeeName : (currentUser?.name || 'Sales Executive'));
        const payload = {
          employeeName: currentEmpName,
          createdBy: currentUser?.id || 'sales',
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
    if (editId) {
      handleExecuteStageTransition('submit');
      return;
    }
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
      const currentEmpName = formData.employeeName || (editId && orderApprovalData?.employeeName ? orderApprovalData.employeeName : (currentUser?.name || 'Sales Executive'));
      const payload = {
        employeeName: currentEmpName,
        createdBy: currentUser?.id || 'sales',
        query: 'order',
        queryStatus,
        orderStage,
        subStage,
        ...formData,
        orderId: finalOrderId || formData.orderId,
        items,
        approvalStatus: 'Pending',
        leadApproval: {
          status: 'Pending',
          note: editId && leadAppr.note ? leadAppr.note : '',
          author: '',
          resubmittedAt: editId ? new Date() : null,
        },
      };
      if (editId) payload._id = editId;
      const res = await api.post('/api/leads', payload);
      alert('Order submitted successfully!\nSent to Lead Manager for approval.');
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

  const handleOpenWorkflowModal = (lead, e) => {
    if (e) e.stopPropagation();
    navigate(`/order/create-lead?id=${lead._id}&from=${encodeURIComponent(location.pathname)}&stage=${encodeURIComponent(lead.orderStage || 'sample')}`);
  };

  const handleCloseWorkflowModal = () => {
    // No-op for backwards compatibility
  };

  const handleExecuteStageTransition = async (action) => {
    const lead = orderApprovalData;
    if (!lead) return;
    const fromUrl = searchParams.get('from') || '';
    let currentSub = (lead.subStage || 'order').toLowerCase().replace(/\s+/g, '-');
    if (fromUrl.includes('/customer-approval-awaiting')) currentSub = 'customer-approval-awaiting';
    else if (fromUrl.includes('/staging-ground')) currentSub = 'staging-ground';
    else if (fromUrl.includes('/ready-to-pick-up')) currentSub = 'ready-to-pick-up';
    else if (fromUrl.includes('/partial/payment-confirmation') || fromUrl.includes('/payment-confirmation')) currentSub = 'payment-confirmation';
    else if (fromUrl.includes('/partial/staging-room')) currentSub = 'staging-room';
    else if (fromUrl.includes('/quality-check')) currentSub = 'quality-check';
    else if (fromUrl.includes('/packaging')) currentSub = 'packaging';
    else if (fromUrl.includes('/delivery-pending')) currentSub = 'delivery-pending';
    else if (fromUrl.includes('/delivered')) currentSub = 'delivered';
    else if (fromUrl.includes('/customer-support')) currentSub = 'customer-support';
    else if (fromUrl.includes('/printing')) currentSub = 'printing';
    else if (fromUrl.includes('/stock')) currentSub = 'stock';
    else if (fromUrl.includes('/dtf-pending')) currentSub = 'dtf-pending';
    const currentOrderStage = (lead.orderStage || 'sample').toLowerCase();

    if (action === 'refer_back' && !stageForm.note.trim()) {
      alert('Please provide a mandatory note explaining the reason for referring back.');
      return;
    }

    setSubmittingStageAction(true);
    try {
      let toStage = currentOrderStage;
      let toSubStage = currentSub;
      let stageData = {};

      if (currentOrderStage === 'sample') {
        if (currentSub === 'dtf-pending') {
          if (action === 'submit') {
            toSubStage = 'stock';
            stageData = { dtfVerified: true, note: stageForm.note };
          } else {
            toSubStage = 'order';
          }
        } else if (currentSub === 'stock') {
          if (action === 'submit') {
            toSubStage = 'printing';
            stageData = { stockVerified: true, note: stageForm.note };
          } else {
            toSubStage = 'dtf-pending';
          }
        } else if (currentSub === 'printing') {
          if (action === 'submit') {
            if (stageForm.stageStatus === 'Complete') {
              toSubStage = 'ready-to-pick-up';
            } else {
              toSubStage = 'printing';
            }
            stageData = {
              printingStatus: stageForm.stageStatus,
              receivedCount: Number(stageForm.receivedCount) || 5,
              readyToPickupCount: Number(stageForm.readyToPickupCount) || 5,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'order';
          }
        } else if (currentSub === 'ready-to-pick-up') {
          if (action === 'submit') {
            toSubStage = 'staging-ground';
            stageData = {
              verifiedPickupCount: Number(stageForm.readyToPickupCount) || 5,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'printing';
          }
        } else if (currentSub === 'staging-ground') {
          if (action === 'submit') {
            toSubStage = 'customer-approval-awaiting';
            stageData = {
              orderRequirementMatch: stageForm.orderRequirementMatch,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'ready-to-pick-up';
          }
        } else if (currentSub === 'customer-approval-awaiting') {
          if (action === 'submit') {
            toStage = 'partial';
            toSubStage = 'order';
            stageData = {
              customerApproved: stageForm.customerApproved,
              customerRequirementsMatch: stageForm.customerRequirementsMatch,
              paymentStatus: stageForm.paymentStatus,
              amountPaid: stageForm.amountPaid,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'staging-ground';
          }
        }
      } else if (currentOrderStage === 'partial') {
        if (currentSub === 'printing') {
          if (action === 'submit') {
            if (stageForm.partialPrintingStatus === 'Complete') {
              toSubStage = 'quality-check';
            } else {
              toSubStage = 'printing';
            }
            stageData = {
              printingStatus: stageForm.partialPrintingStatus,
              printedCount: Number(stageForm.partialPrintedCount) || 80,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'order';
          }
        } else if (currentSub === 'quality-check') {
          if (action === 'submit') {
            toSubStage = 'packaging';
            stageData = {
              passedCount: Number(stageForm.partialQcPassedCount) || 80,
              rejectedCount: Number(stageForm.partialQcRejectedCount) || 0,
              qcPassed: true,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'printing';
          }
        } else if (currentSub === 'packaging') {
          if (action === 'submit') {
            toSubStage = 'staging-room';
            stageData = {
              packedCount: Number(stageForm.partialPackedCount) || 80,
              cartonCount: Number(stageForm.partialCartonCount) || 2,
              packagingComplete: true,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'quality-check';
          }
        } else if (currentSub === 'staging-room') {
          if (action === 'submit') {
            toSubStage = 'payment-confirmation';
            stageData = {
              stagedRackNumber: stageForm.partialStagingRack || 'Rack P-04',
              dispatchReady: true,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'packaging';
          }
        } else if (currentSub === 'payment-confirmation') {
          if (action === 'submit') {
            toStage = 'complete';
            toSubStage = 'order';
            stageData = {
              invoiceNumber: stageForm.partialInvoiceNo || 'INV-PART-01',
              paymentMode: stageForm.partialPaymentMode || 'Bank Transfer',
              amountReceived: Number(stageForm.partialAmountReceived) || 50000,
              balancePending: Number(stageForm.partialBalanceRemaining) || 0,
              paymentVerified: true,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'staging-room';
          }
        }
      } else if (currentOrderStage === 'complete') {
        if (currentSub === 'printing') {
          if (action === 'submit') {
            if (stageForm.completePrintingStatus === 'Complete') {
              toSubStage = 'quality-check';
            } else {
              toSubStage = 'printing';
            }
            stageData = {
              printingStatus: stageForm.completePrintingStatus,
              printedCount: Number(stageForm.completePrintedCount) || lead.totalQuantity || 100,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'order';
          }
        } else if (currentSub === 'quality-check') {
          if (action === 'submit') {
            toSubStage = 'packaging';
            stageData = {
              passedCount: Number(stageForm.completeQcPassedCount) || lead.totalQuantity || 100,
              rejectedCount: Number(stageForm.completeQcRejectedCount) || 0,
              qcPassed: true,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'printing';
          }
        } else if (currentSub === 'packaging') {
          if (action === 'submit') {
            toSubStage = 'delivery-pending';
            stageData = {
              masterCartonsCount: Number(stageForm.completeMasterCartonsCount) || 4,
              totalUnitsPacked: Number(stageForm.completeUnitsPacked) || lead.totalQuantity || 100,
              packagingComplete: true,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'quality-check';
          }
        } else if (currentSub === 'delivery-pending') {
          if (action === 'submit') {
            toSubStage = 'delivered';
            stageData = {
              courierName: stageForm.completeCourierName || 'Blue Dart Express',
              trackingNumber: stageForm.completeTrackingNumber || 'AWB-BD-882319',
              dispatchDate: stageForm.completeDispatchDate || new Date().toISOString().split('T')[0],
              driverPhone: stageForm.completeDriverPhone || '+91 98765 43210',
              dispatchComplete: true,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'packaging';
          }
        } else if (currentSub === 'delivered') {
          if (action === 'submit') {
            toSubStage = 'customer-support';
            stageData = {
              deliveredDate: stageForm.completeDeliveryDate || new Date().toISOString().split('T')[0],
              receivedBy: stageForm.completeReceivedBy || lead.clientName || 'Store Manager',
              recipientContact: stageForm.completeRecipientPhone || lead.phoneNumber || '+91 98110 00000',
              podNumber: stageForm.completePodNumber || 'POD-99214',
              deliveryVerified: true,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'delivery-pending';
          }
        } else if (currentSub === 'customer-support') {
          if (action === 'submit') {
            toStage = 'complete';
            toSubStage = 'customer-support';
            stageData = {
              clientRating: Number(stageForm.completeClientRating) || 5,
              supportResolutionStatus: stageForm.completeSupportResolution || 'Delivered & Client Fully Satisfied',
              feedbackNotes: stageForm.completeClientFeedback || 'Excellent quality and timely delivery',
              orderFulfilled: true,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'delivered';
          }
        }
      }

      const payload = {
        fromStage: currentOrderStage,
        toStage,
        fromSubStage: currentSub,
        toSubStage,
        action,
        stageData,
        comment: stageForm.note.trim(),
        author: currentUser?.name || 'Operator',
        role: currentUser?.role || 'Manager',
      };

      const res = await api.patch(`/api/leads/${lead._id}/stage-transition`, payload);
      if (res.data?.success) {
        let msg = `Order #${lead.orderId || 'Order'} `;
        if (action === 'refer_back') {
          msg += `referred back to ${toSubStage.replace(/-/g, ' ')}.`;
        } else if (currentSub === 'customer-approval-awaiting' && currentOrderStage === 'sample') {
          msg += `sample approved! Order advanced to Partial Stage (Stock & Production tasks assigned).`;
        } else if (currentSub === 'payment-confirmation' && currentOrderStage === 'partial') {
          msg += `partial payment verified! Order advanced to Complete Stage (Stock & Production tasks assigned).`;
        } else if (currentSub === 'customer-support' && currentOrderStage === 'complete') {
          msg += `order successfully completed and archived!`;
        } else {
          msg += `advanced to ${toStage.toUpperCase()} -> ${toSubStage.replace(/-/g, ' ').toUpperCase()}!`;
        }
        alert(msg);
        if (toSubStage === 'customer-support') {
          navigate('/order/customer-support');
        } else {
          navigate(`/order/${toStage}/${toSubStage}`);
        }
      }
    } catch (err) {
      console.error('Error transitioning stage:', err);
      alert('Failed to update stage: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingStageAction(false);
    }
  };

  const renderStageWorkflowCard = () => {
    if (!orderApprovalData) return null;
    const fromUrl = searchParams.get('from') || '';
    let fromSub = '';
    if (fromUrl) {
      const match = fromUrl.match(/\/order\/(sample|partial|complete)\/([a-z0-9-]+)/);
      if (match && match[2]) {
        fromSub = match[2];
      }
    }
    const currentSub = (orderApprovalData.subStage || 'order').toLowerCase().replace(/\s+/g, '-');
    let activeSub = fromSub || currentSub;
    if (fromUrl.includes('/customer-approval-awaiting')) activeSub = 'customer-approval-awaiting';
    else if (fromUrl.includes('/staging-ground')) activeSub = 'staging-ground';
    else if (fromUrl.includes('/ready-to-pick-up')) activeSub = 'ready-to-pick-up';
    else if (fromUrl.includes('/printing')) activeSub = 'printing';
    else if (fromUrl.includes('/quality-check')) activeSub = 'quality-check';
    else if (fromUrl.includes('/packaging')) activeSub = 'packaging';
    else if (fromUrl.includes('/staging-room')) activeSub = 'staging-room';
    else if (fromUrl.includes('/payment-confirmation')) activeSub = 'payment-confirmation';
    else if (fromUrl.includes('/delivery-pending')) activeSub = 'delivery-pending';
    else if (fromUrl.includes('/delivered')) activeSub = 'delivered';
    else if (fromUrl.includes('/customer-support')) activeSub = 'customer-support';
    else if (fromUrl.includes('/stock')) activeSub = 'stock';
    else if (fromUrl.includes('/dtf-pending')) activeSub = 'dtf-pending';

    const urlStageMatch = fromUrl.match(/\/order\/(sample|partial|complete)/);
    const currentOrderStage = (searchParams.get('stage') || (urlStageMatch ? urlStageMatch[1] : null) || orderApprovalData.orderStage || 'sample').toLowerCase();

    // Sample sub-stages
    const isSampleDtfPending = currentOrderStage === 'sample' && activeSub === 'dtf-pending';
    const isSampleStock = currentOrderStage === 'sample' && activeSub === 'stock';
    const isSamplePrinting = currentOrderStage === 'sample' && activeSub === 'printing';
    const isSampleReadyToPickup = currentOrderStage === 'sample' && activeSub === 'ready-to-pick-up';
    const isSampleStagingGround = currentOrderStage === 'sample' && activeSub === 'staging-ground';
    const isSampleCustomerApproval = currentOrderStage === 'sample' && activeSub === 'customer-approval-awaiting';

    // Partial sub-stages
    const isPartialPrinting = currentOrderStage === 'partial' && activeSub === 'printing';
    const isPartialQualityCheck = currentOrderStage === 'partial' && activeSub === 'quality-check';
    const isPartialPackaging = currentOrderStage === 'partial' && activeSub === 'packaging';
    const isPartialStagingRoom = currentOrderStage === 'partial' && activeSub === 'staging-room';
    const isPartialPaymentConfirmation = currentOrderStage === 'partial' && activeSub === 'payment-confirmation';

    // Complete sub-stages
    const isCompletePrinting = currentOrderStage === 'complete' && activeSub === 'printing';
    const isCompleteQualityCheck = currentOrderStage === 'complete' && activeSub === 'quality-check';
    const isCompletePackaging = currentOrderStage === 'complete' && activeSub === 'packaging';
    const isCompleteDeliveryPending = currentOrderStage === 'complete' && activeSub === 'delivery-pending';
    const isCompleteDelivered = currentOrderStage === 'complete' && activeSub === 'delivered';
    const isCompleteCustomerSupport = currentOrderStage === 'complete' && activeSub === 'customer-support';

    // Clearance check: awaiting clearance tasks for Partial or Complete
    const isAwaitingTaskClearance = (currentOrderStage === 'partial' || currentOrderStage === 'complete') &&
      (orderApprovalData.stockApproval?.status !== 'Approved' || orderApprovalData.productionApproval?.status !== 'Approved') &&
      (activeSub === 'order' || activeSub === 'leads');

    const isRecognizedWorkflowStage = Boolean(
      isSamplePrinting || isSampleReadyToPickup || isSampleStagingGround || isSampleCustomerApproval ||
      isPartialPrinting || isPartialQualityCheck || isPartialPackaging || isPartialStagingRoom || isPartialPaymentConfirmation ||
      isCompletePrinting || isCompleteQualityCheck || isCompletePackaging || isCompleteDeliveryPending || isCompleteDelivered || isCompleteCustomerSupport ||
      isAwaitingTaskClearance
    );

    if (!isRecognizedWorkflowStage) {
      return null;
    }

    const isCurrentStageApproved = Boolean(
      // Sample
      (activeSub === 'printing' && currentOrderStage === 'sample' && (orderApprovalData.printingStageData?.printingStatus === 'Complete' || ['ready-to-pick-up', 'staging-ground', 'customer-approval-awaiting'].includes(currentSub) || currentOrderStage !== 'sample')) ||
      (activeSub === 'ready-to-pick-up' && (orderApprovalData.sampleReadyToPickUpData?.note || orderApprovalData.sampleReadyToPickUpData?.readyToPickupCount || ['staging-ground', 'customer-approval-awaiting'].includes(currentSub) || currentOrderStage !== 'sample')) ||
      (activeSub === 'staging-ground' && (orderApprovalData.sampleStagingGroundData?.orderRequirementMatch || currentSub === 'customer-approval-awaiting' || currentOrderStage !== 'sample')) ||
      (activeSub === 'customer-approval-awaiting' && (orderApprovalData.customerApprovalData?.customerApproved !== undefined || currentOrderStage !== 'sample')) ||
      // Partial
      (activeSub === 'printing' && currentOrderStage === 'partial' && (orderApprovalData.partialPrintingData?.printingStatus === 'Complete' || ['quality-check', 'packaging', 'staging-room', 'payment-confirmation'].includes(currentSub) || currentOrderStage === 'complete')) ||
      (activeSub === 'quality-check' && currentOrderStage === 'partial' && (Boolean(orderApprovalData.partialQualityCheckData?.passedCount) || ['packaging', 'staging-room', 'payment-confirmation'].includes(currentSub) || currentOrderStage === 'complete')) ||
      (activeSub === 'packaging' && currentOrderStage === 'partial' && (Boolean(orderApprovalData.partialPackagingData?.packedCount) || ['staging-room', 'payment-confirmation'].includes(currentSub) || currentOrderStage === 'complete')) ||
      (activeSub === 'staging-room' && currentOrderStage === 'partial' && (Boolean(orderApprovalData.partialStagingRoomData?.dispatchReady) || currentSub === 'payment-confirmation' || currentOrderStage === 'complete')) ||
      (activeSub === 'payment-confirmation' && currentOrderStage === 'partial' && (Boolean(orderApprovalData.partialPaymentConfirmationData?.paymentVerified) || currentOrderStage === 'complete')) ||
      // Complete
      (activeSub === 'printing' && currentOrderStage === 'complete' && (orderApprovalData.completePrintingData?.printingStatus === 'Complete' || ['quality-check', 'packaging', 'delivery-pending', 'delivered', 'customer-support'].includes(currentSub))) ||
      (activeSub === 'quality-check' && currentOrderStage === 'complete' && (Boolean(orderApprovalData.completeQualityCheckData?.passedCount) || ['packaging', 'delivery-pending', 'delivered', 'customer-support'].includes(currentSub))) ||
      (activeSub === 'packaging' && currentOrderStage === 'complete' && (Boolean(orderApprovalData.completePackagingData?.totalUnitsPacked) || ['delivery-pending', 'delivered', 'customer-support'].includes(currentSub))) ||
      (activeSub === 'delivery-pending' && currentOrderStage === 'complete' && (Boolean(orderApprovalData.completeDeliveryPendingData?.trackingNumber) || ['delivered', 'customer-support'].includes(currentSub))) ||
      (activeSub === 'delivered' && currentOrderStage === 'complete' && (Boolean(orderApprovalData.completeDeliveredData?.deliveredDate) || currentSub === 'customer-support')) ||
      (activeSub === 'customer-support' && currentOrderStage === 'complete' && (Boolean(orderApprovalData.completeCustomerSupportData?.clientRating || orderApprovalData.isCompleted || orderApprovalData.approvalStatus === 'Completed')))
    );

    const itemsList = Array.isArray(orderApprovalData.items) ? orderApprovalData.items : [];

    return (
      <div
        className="stage-inline-panel"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderLeft: `5px solid ${
            (isSamplePrinting || isPartialPrinting || isCompletePrinting) ? '#0284c7' :
            (isSampleReadyToPickup || isPartialPackaging || isCompleteDeliveryPending) ? '#2563eb' :
            (isSampleStagingGround || isPartialStagingRoom || isCompletePackaging) ? '#7c3aed' :
            (isSampleCustomerApproval || isPartialPaymentConfirmation || isCompleteCustomerSupport) ? '#059669' :
            (isPartialQualityCheck || isCompleteQualityCheck) ? '#d97706' :
            isCompleteDelivered ? '#10b981' : '#3b82f6'
          }`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '22px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Stage Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Stage Status:</span>
            {isSamplePrinting ? (
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background:
                    stageForm.stageStatus === 'Complete'
                      ? '#d1fae5'
                      : stageForm.stageStatus === 'On Hold'
                      ? '#ffedd5'
                      : '#dbeafe',
                  color:
                    stageForm.stageStatus === 'Complete'
                      ? '#065f46'
                      : stageForm.stageStatus === 'On Hold'
                      ? '#c2410c'
                      : '#1d4ed8',
                  border: `1px solid ${
                    stageForm.stageStatus === 'Complete'
                      ? '#a7f3d0'
                      : stageForm.stageStatus === 'On Hold'
                      ? '#fed7aa'
                      : '#bfdbfe'
                  }`,
                }}
              >
                ● {stageForm.stageStatus}
              </span>
            ) : (
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: isCurrentStageApproved ? '#dcfce7' : '#fef3c7',
                  color: isCurrentStageApproved ? '#15803d' : '#b45309',
                  border: isCurrentStageApproved ? '1px solid #bbf7d0' : '1px solid #fde68a',
                }}
              >
                {isCurrentStageApproved ? '✓ Approved & Advanced' : '● In Progress'}
              </span>
            )}
          </div>
        </div>

        {/* 0.A CASE: SAMPLE -> DTF PENDING */}
        {isSampleDtfPending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                DTF Remarks / Instructions
              </label>
              <textarea
                rows={2}
                placeholder="Enter DTF instructions or notes..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 0.B CASE: SAMPLE -> STOCK */}
        {isSampleStock && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Stock Remarks / Instructions
              </label>
              <textarea
                rows={2}
                placeholder="Enter stock allocation notes..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 1. CASE: SAMPLE -> PRINTING */}
        {isSamplePrinting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Status selector pills */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Printing Execution Status:
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Select status. &apos;Complete&apos; advances order to Ready to Pick Up on submit; &apos;Work in Progress&apos; &amp; &apos;On Hold&apos; stay in Printing list.
                  </span>
                </div>
                <div className="stage-tabs-pill-group" style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '5px', borderRadius: '8px' }}>
                  {[
                    { key: 'Work in Progress', color: '#1d4ed8', bg: '#dbeafe', border: '#2563eb' },
                    { key: 'On Hold', color: '#c2410c', bg: '#ffedd5', border: '#ea580c' },
                    { key: 'Complete', color: '#065f46', bg: '#d1fae5', border: '#10b981' },
                  ].map((st) => {
                    const isAct = stageForm.stageStatus === st.key;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        id={`btn-status-${st.key.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => setStageForm({ ...stageForm, stageStatus: st.key })}
                        style={{
                          border: isAct ? `2px solid ${st.border}` : '1px solid transparent',
                          background: isAct ? st.bg : '#ffffff',
                          color: isAct ? st.color : '#64748b',
                          padding: '7px 16px',
                          borderRadius: '6px',
                          fontSize: '12.5px',
                          fontWeight: isAct ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isAct ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                      >
                        {isAct ? '● ' : ''}{st.key}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3 Dedicated Previous Clearance Data Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {/* 1. Logo Cutting Clearance Data */}
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e0f2fe', paddingBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ✂️ Logo Cutting Data
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: '#dcfce7',
                      color: '#166534',
                    }}
                  >
                    ✓ {orderApprovalData.productionApproval?.status || 'Approved'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#0f172a', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Logos Needed (Client):</span>
                    <strong>{orderApprovalData.totalQuantity || 100} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Logos Printed:</span>
                    <strong>{orderApprovalData.productionTaskData?.logosPrinted || orderApprovalData.totalQuantity || 100} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Logos Cut / Given:</span>
                    <strong>{orderApprovalData.productionTaskData?.logosCutGiven || orderApprovalData.productionTaskData?.logosCutOrGiven || orderApprovalData.totalQuantity || 100} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Giving for Sample:</span>
                    <strong style={{ color: '#0369a1' }}>{orderApprovalData.productionTaskData?.sampleLogosCount || orderApprovalData.productionTaskData?.logosForSample || 5} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Logo Name:</span>
                    <span style={{ fontWeight: 600, maxWidth: '130px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={orderApprovalData.logoName || 'Main Logo'}>
                      {orderApprovalData.logoName || 'Main Logo'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#475569' }}>Artwork Attachment:</span>
                    {orderApprovalData.attachment ? (
                      <a
                        href={orderApprovalData.attachment.startsWith('http') || orderApprovalData.attachment.startsWith('/') ? orderApprovalData.attachment : `/uploads/${orderApprovalData.attachment}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline', fontSize: '11px' }}
                      >
                        📎 View File
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>None</span>
                    )}
                  </div>
                  {orderApprovalData.productionApproval?.note && (
                    <div style={{ marginTop: '4px', padding: '6px 8px', background: '#e0f2fe', borderRadius: '6px', fontSize: '11px', color: '#0369a1' }}>
                      <em>&ldquo;{orderApprovalData.productionApproval.note}&rdquo;</em>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Ready to Pick Clearance Data */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #dcfce7', paddingBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📦 Ready to Pick Data
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: '#dcfce7',
                      color: '#166534',
                    }}
                  >
                    ✓ {orderApprovalData.stockApproval?.status || 'Approved'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#0f172a', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Total Order Stock:</span>
                    <strong>{orderApprovalData.totalQuantity || 100} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Stock Availability:</span>
                    <strong style={{ color: orderApprovalData.stockTaskData?.isStockAvailable !== false ? '#166534' : '#b45309' }}>
                      {orderApprovalData.stockTaskData?.isStockAvailable !== false ? 'In Stock (Available)' : 'Low Stock'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Deficit Pieces:</span>
                    <strong>{orderApprovalData.stockTaskData?.notInStockCount ? `${orderApprovalData.stockTaskData.notInStockCount} pcs short` : '0 pcs (None)'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Sample Deduction:</span>
                    <strong style={{ color: '#166534' }}>{orderApprovalData.stockTaskData?.sampleDeduction !== undefined ? orderApprovalData.stockTaskData.sampleDeduction : 0} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ color: '#475569' }}>Stock Depreciation:</span>
                    <span style={{ fontSize: '11.5px', color: '#14532d', background: '#dcfce7', padding: '4px 6px', borderRadius: '4px' }}>
                      {orderApprovalData.stockTaskData?.stockDepreciation || (orderApprovalData.stockTaskData?.sampleDeduction ? `Giving ${orderApprovalData.stockTaskData.sampleDeduction} for sample. Remaining: ${Math.max(0, (orderApprovalData.totalQuantity || 100) - orderApprovalData.stockTaskData.sampleDeduction)} in stock.` : 'Stock allocation pending')}
                    </span>
                  </div>
                  {orderApprovalData.stockApproval?.note && (
                    <div style={{ marginTop: '4px', padding: '6px 8px', background: '#dcfce7', borderRadius: '6px', fontSize: '11px', color: '#14532d' }}>
                      <em>&ldquo;{orderApprovalData.stockApproval.note}&rdquo;</em>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Staging Room Clearance Data */}
              <div
                style={{
                  background: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3e8ff', paddingBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#7e22ce', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🏷️ Staging Room Data
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: '#f3e8ff',
                      color: '#6b21a8',
                    }}
                  >
                    ✓ {orderApprovalData.stockTaskStage === 'completed' || orderApprovalData.stockApproval?.status === 'Approved' ? 'Completed' : 'Staged'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#0f172a', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Received at Staging:</span>
                    <strong style={{ color: '#7e22ce' }}>{orderApprovalData.stockTaskData?.receivedCount !== undefined ? orderApprovalData.stockTaskData.receivedCount : (orderApprovalData.stockTaskData?.sampleDeduction || 0)} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Given for Sample:</span>
                    <strong>{orderApprovalData.stockTaskData?.sampleDeduction !== undefined ? orderApprovalData.stockTaskData.sampleDeduction : 0} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Pending at Staging:</span>
                    <strong>{orderApprovalData.stockTaskData?.pendingCount || 0} pcs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Task Stage:</span>
                    <strong style={{ textTransform: 'capitalize' }}>{String(orderApprovalData.stockTaskStage || 'completed').replace(/_/g, ' ')}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                    <span style={{ color: '#475569' }}>Staging Verification:</span>
                    <span style={{ fontSize: '11.5px', color: '#581c87', background: '#f3e8ff', padding: '4px 6px', borderRadius: '4px' }}>
                      {orderApprovalData.approvalComments?.find(c => c.comment?.toLowerCase().includes('staging'))?.comment || orderApprovalData.stockApproval?.note || 'Sample items staged and verified for printing.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inputs for Printing Count and Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  How many received at printing? (pcs)
                </label>
                <input
                  type="number"
                  min="1"
                  value={stageForm.receivedCount}
                  onChange={(e) => setStageForm({ ...stageForm, receivedCount: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  How many going for ready to pick up? (pcs)
                </label>
                <input
                  type="number"
                  min="1"
                  value={stageForm.readyToPickupCount}
                  onChange={(e) => setStageForm({ ...stageForm, readyToPickupCount: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Notes / Refer Back Comments (Mandatory if referring back)
              </label>
              <textarea
                rows={2}
                placeholder="Enter stage notes or refer back instructions..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 2. CASE: SAMPLE -> READY TO PICK UP */}
        {isSampleReadyToPickup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e40af', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} color="#1e40af" /> Verified Data from Printing & Clearance Stages
              </div>
              <div style={{ fontSize: '13px', color: '#1e3a8a', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                <div>Received at Printing: <strong>{orderApprovalData.printingStageData?.receivedCount || 5} pcs</strong></div>
                <div>Going for Ready to Pick Up: <strong>{orderApprovalData.printingStageData?.readyToPickupCount || 5} pcs</strong></div>
                <div>Printing Stage Status: <strong>{orderApprovalData.printingStageData?.printingStatus || 'Complete'}</strong></div>
                <div>Stock Clearance: <strong style={{ color: '#166534' }}>{orderApprovalData.stockApproval?.status || 'Approved'}</strong> ({orderApprovalData.stockApproval?.author || 'Elena Rostova'})</div>
              </div>
              {orderApprovalData.printingStageData?.note && (
                <div style={{ fontSize: '12px', color: '#1e3a8a', background: '#ffffff', padding: '6px 10px', borderRadius: '4px', border: '1px solid #bfdbfe', marginTop: '6px' }}>
                  <strong>Printing Run Notes:</strong> "{orderApprovalData.printingStageData.note}"
                </div>
              )}
            </div>

            {/* Garments / Items Breakdown for Ready to Pick Up */}
            <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                  Garments / Items for Ready to Pick Up ({itemsList.length})
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                  Total: {orderApprovalData.totalQuantity || itemsList.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 100} pcs
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {itemsList.map((item, idx) => (
                  <div key={idx} style={{ fontSize: '12.5px', color: '#334155', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      <strong>{item.item || 'Item'}</strong> ({[item.fabric, item.color ? `Color: ${item.color}` : null, item.size ? `Size: ${item.size}` : null].filter(Boolean).join(', ')})
                    </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {item.quantity || 1} pcs {item.printingType ? `— ${item.printingType}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={true}
                  readOnly
                  style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }}
                />
                <span>Samples are packed, labeled, and ready for pickup</span>
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Notes / Comments (Mandatory if referring back to printing)
              </label>
              <textarea
                rows={2}
                placeholder="Enter pickup notes or refer back reason..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 3. CASE: SAMPLE -> STAGING GROUND */}
        {isSampleStagingGround && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Previous Stage Verifications (Ready to Pick Up & Printing) */}
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#0284c7" /> Previous Stage Verifications (Ready to Pick Up & Printing)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
                <div>Verified Pickup Count: <strong style={{ color: '#0f172a' }}>{orderApprovalData.sampleReadyToPickUpData?.readyToPickupCount || orderApprovalData.sampleReadyToPickUpData?.verifiedPickupCount || orderApprovalData.printingStageData?.readyToPickupCount || 5} pcs</strong></div>
                <div>Printing Run Status: <strong style={{ color: '#0f172a' }}>{orderApprovalData.printingStageData?.printingStatus || 'Complete'}</strong></div>
                <div>Stock Clearance: <strong style={{ color: '#166534' }}>{orderApprovalData.stockApproval?.status || 'Approved'}</strong> ({orderApprovalData.stockApproval?.author || 'Elena Rostova'})</div>
                <div>Production Clearance: <strong style={{ color: '#166534' }}>{orderApprovalData.productionApproval?.status || 'Approved'}</strong> ({orderApprovalData.productionApproval?.author || 'Marcus Vance'})</div>
              </div>
              {orderApprovalData.sampleReadyToPickUpData?.note && (
                <div style={{ fontSize: '12px', color: '#475569', background: '#ffffff', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <strong>Ready to Pick Up Remarks:</strong> "{orderApprovalData.sampleReadyToPickUpData.note}"
                </div>
              )}
            </div>

            <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#6b21a8', marginBottom: '8px' }}>
                Staging Ground Verification Checklist
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#4a044e' }}>
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                    style={{ accentColor: '#9333ea', transform: 'scale(1.2)' }}
                  />
                  <span>Samples received and staged in physical verification rack</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#4a044e' }}>
                  <input
                    type="checkbox"
                    checked={stageForm.orderRequirementMatch}
                    onChange={(e) => setStageForm({ ...stageForm, orderRequirementMatch: e.target.checked })}
                    style={{ accentColor: '#9333ea', transform: 'scale(1.2)' }}
                  />
                  <span>All client specifications and garment counts verified</span>
                </label>
              </div>
            </div>

            {/* Garments / Items Breakdown for Staging Ground */}
            <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                  Garments / Items for Verification ({itemsList.length})
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#7c3aed' }}>
                  Total: {orderApprovalData.totalQuantity || itemsList.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 100} pcs
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {itemsList.map((item, idx) => (
                  <div key={idx} style={{ fontSize: '12.5px', color: '#334155', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      <strong>{item.item || 'Item'}</strong> ({[item.fabric, item.color ? `Color: ${item.color}` : null, item.size ? `Size: ${item.size}` : null].filter(Boolean).join(', ')})
                    </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {item.quantity || 1} pcs {item.printingType ? `— ${item.printingType}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Notes / Verification Comments
              </label>
              <textarea
                rows={2}
                placeholder="Enter staging verification remarks..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 4. CASE: SAMPLE -> CUSTOMER APPROVAL AWAITING */}
        {isSampleCustomerApproval && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Previous Stage Verifications (Staging Ground & Physical Checks) */}
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#7c3aed" /> Previous Stage Verifications (Staging Ground & Physical Checks)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
                <div>Staging Verification: <strong style={{ color: '#166534' }}>✓ Staged in Physical Rack</strong></div>
                <div>Client Specs Verified: <strong style={{ color: '#166534' }}>{orderApprovalData.sampleStagingGroundData?.orderRequirementMatch !== false ? 'Yes, Confirmed' : 'Pending'}</strong></div>
                <div>Verified Count: <strong style={{ color: '#0f172a' }}>{orderApprovalData.sampleReadyToPickUpData?.readyToPickupCount || orderApprovalData.sampleReadyToPickUpData?.verifiedPickupCount || 5} pcs</strong></div>
                <div>Printing Status: <strong style={{ color: '#0f172a' }}>{orderApprovalData.printingStageData?.printingStatus || 'Complete'}</strong></div>
              </div>
              {orderApprovalData.sampleStagingGroundData?.note && (
                <div style={{ fontSize: '12px', color: '#475569', background: '#ffffff', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <strong>Staging Ground Remarks:</strong> "{orderApprovalData.sampleStagingGroundData.note}"
                </div>
              )}
            </div>

            {/* Garments / Items Breakdown for Customer Approval */}
            <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                  Customer Order Items ({itemsList.length})
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                  Total: {orderApprovalData.totalQuantity || itemsList.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 100} pcs
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {itemsList.map((item, idx) => (
                  <div key={idx} style={{ fontSize: '12.5px', color: '#334155', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      <strong>{item.item || 'Item'}</strong> ({[item.fabric, item.color ? `Color: ${item.color}` : null, item.size ? `Size: ${item.size}` : null].filter(Boolean).join(', ')})
                    </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {item.quantity || 1} pcs {item.printingType ? `— ${item.printingType}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#065f46', marginBottom: '10px' }}>
                Customer Sign-Off & Approval
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#065f46' }}>Has customer approved sample?</span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="customerApprovedInline"
                      checked={stageForm.customerApproved}
                      onChange={() => setStageForm({ ...stageForm, customerApproved: true })}
                    />
                    <span>Yes, Approved</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="customerApprovedInline"
                      checked={!stageForm.customerApproved}
                      onChange={() => setStageForm({ ...stageForm, customerApproved: false })}
                    />
                    <span>Revisions Needed</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Customer Feedback / Comments
              </label>
              <textarea
                rows={2}
                placeholder="Enter customer feedback or sign-off notes..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 5.A CASE: PARTIAL -> PRINTING */}
        {isPartialPrinting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Garments Breakdown */}
            <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                  Garments for Partial Printing ({itemsList.length})
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>
                  Target Partial Run: {stageForm.partialPrintedCount || orderApprovalData.totalQuantity || 18} pcs
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {itemsList.map((item, idx) => (
                  <div key={idx} style={{ fontSize: '12.5px', color: '#334155', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>{item.item || 'Item'}</strong> ({[item.fabric, item.color ? `Color: ${item.color}` : null, item.size ? `Size: ${item.size}` : null].filter(Boolean).join(', ')})</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.quantity || 1} pcs</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Printing Inputs */}
            <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0369a1', marginBottom: '10px' }}>
                Partial Printing Execution Metrics
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                    Pieces Printed in Partial Run
                  </label>
                  <input
                    type="number"
                    value={stageForm.partialPrintedCount}
                    onChange={(e) => setStageForm({ ...stageForm, partialPrintedCount: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                    Partial Run Status
                  </label>
                  <select
                    value={stageForm.partialPrintingStatus}
                    onChange={(e) => setStageForm({ ...stageForm, partialPrintingStatus: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  >
                    <option value="Complete">Complete (Ready for Quality Check)</option>
                    <option value="Work in Progress">Work in Progress</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Partial Printing Notes (Mandatory if referring back)
              </label>
              <textarea
                rows={2}
                placeholder="Enter partial printing remarks or instructions..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 5.B CASE: PARTIAL -> QUALITY CHECK */}
        {isPartialQualityCheck && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#fefce8', padding: '14px 16px', borderRadius: '8px', border: '1px solid #fef08a' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#854d0e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#ca8a04" /> Verified Data from Partial Printing
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '12.5px', color: '#713f12' }}>
                <div>Pieces Printed: <strong style={{ color: '#0f172a' }}>{orderApprovalData.partialPrintingData?.printedCount || 80} pcs</strong></div>
                <div>Printing Status: <strong style={{ color: '#166534' }}>{orderApprovalData.partialPrintingData?.printingStatus || 'Complete'}</strong></div>
                <div>Customer Sample Sign-Off: <strong style={{ color: '#166534' }}>✓ Approved</strong></div>
              </div>
              {orderApprovalData.partialPrintingData?.note && (
                <div style={{ fontSize: '12px', color: '#713f12', background: '#ffffff', padding: '6px 10px', borderRadius: '4px', border: '1px solid #fef08a', marginTop: '6px' }}>
                  <strong>Printing Remarks:</strong> "{orderApprovalData.partialPrintingData.note}"
                </div>
              )}
            </div>

            {/* QC Checklist */}
            <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#b45309', marginBottom: '10px' }}>
                Quality Check Inspection Standards
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#78350f' }}>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: '#d97706', transform: 'scale(1.2)' }} />
                  <span>Stitching, hemming, and seam strength verified</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#78350f' }}>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: '#d97706', transform: 'scale(1.2)' }} />
                  <span>Print curing and logo alignment verified against approved sample</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#78350f' }}>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: '#d97706', transform: 'scale(1.2)' }} />
                  <span>Color consistency and fabric integrity verified</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>
                    Passed Units (pcs)
                  </label>
                  <input
                    type="number"
                    value={stageForm.partialQcPassedCount}
                    onChange={(e) => setStageForm({ ...stageForm, partialQcPassedCount: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>
                    Rejected / Repair Units (pcs)
                  </label>
                  <input
                    type="number"
                    value={stageForm.partialQcRejectedCount}
                    onChange={(e) => setStageForm({ ...stageForm, partialQcRejectedCount: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Quality Check Inspector Notes (Mandatory if referring back)
              </label>
              <textarea
                rows={2}
                placeholder="Enter quality verification remarks..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 5.C CASE: PARTIAL -> PACKAGING */}
        {isPartialPackaging && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#2563eb" /> Verified Data from Quality Check
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
                <div>QC Passed Units: <strong style={{ color: '#166534' }}>{orderApprovalData.partialQualityCheckData?.passedCount || 80} pcs</strong></div>
                <div>QC Rejection Count: <strong style={{ color: '#0f172a' }}>{orderApprovalData.partialQualityCheckData?.rejectedCount || 0} pcs</strong></div>
                <div>Inspection Status: <strong style={{ color: '#166534' }}>✓ Quality Passed</strong></div>
              </div>
              {orderApprovalData.partialQualityCheckData?.note && (
                <div style={{ fontSize: '12px', color: '#475569', background: '#ffffff', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                  <strong>QC Remarks:</strong> "{orderApprovalData.partialQualityCheckData.note}"
                </div>
              )}
            </div>

            <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1d4ed8', marginBottom: '10px' }}>
                Packaging & Labeling Execution
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#1e40af' }}>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }} />
                  <span>Garments individually folded into sealed polybags with moisture silica</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#1e40af' }}>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }} />
                  <span>Carton labels and size-breakdown barcodes affixed</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                    Total Units Packed (pcs)
                  </label>
                  <input
                    type="number"
                    value={stageForm.partialPackedCount}
                    onChange={(e) => setStageForm({ ...stageForm, partialPackedCount: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                    Cartons / Boxes Count
                  </label>
                  <input
                    type="number"
                    value={stageForm.partialCartonCount}
                    onChange={(e) => setStageForm({ ...stageForm, partialCartonCount: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Packaging Supervisor Notes (Mandatory if referring back)
              </label>
              <textarea
                rows={2}
                placeholder="Enter packaging instructions or notes..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 5.D CASE: PARTIAL -> STAGING ROOM */}
        {isPartialStagingRoom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#7c3aed" /> Verified Data from Packaging
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
                <div>Packed Units: <strong style={{ color: '#0f172a' }}>{orderApprovalData.partialPackagingData?.packedCount || 80} pcs</strong></div>
                <div>Cartons Packed: <strong style={{ color: '#0f172a' }}>{orderApprovalData.partialPackagingData?.cartonCount || 2} boxes</strong></div>
                <div>QC Certification: <strong style={{ color: '#166534' }}>✓ Verified Passed</strong></div>
              </div>
              {orderApprovalData.partialPackagingData?.note && (
                <div style={{ fontSize: '12px', color: '#475569', background: '#ffffff', padding: '6px 10px', borderRadius: '4px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                  <strong>Packaging Remarks:</strong> "{orderApprovalData.partialPackagingData.note}"
                </div>
              )}
            </div>

            <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#6b21a8', marginBottom: '10px' }}>
                Partial Staging Room Verification
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#4a044e' }}>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: '#7c3aed', transform: 'scale(1.2)' }} />
                  <span>Cartons staged in designated Partial Dispatch Bay</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#4a044e' }}>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: '#7c3aed', transform: 'scale(1.2)' }} />
                  <span>Physical carton count matches packaging delivery manifest</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#6b21a8', marginBottom: '4px' }}>
                    Staging Rack / Bay Identifier
                  </label>
                  <input
                    type="text"
                    value={stageForm.partialStagingRack}
                    onChange={(e) => setStageForm({ ...stageForm, partialStagingRack: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Staging Handler Remarks (Mandatory if referring back)
              </label>
              <textarea
                rows={2}
                placeholder="Enter staging bay remarks..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 5.E CASE: PARTIAL -> PAYMENT CONFIRMATION (Last step of Partial) */}
        {isPartialPaymentConfirmation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#059669" /> Cumulative Partial Production Verification
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
                <div>Staging Bay Location: <strong style={{ color: '#0f172a' }}>{orderApprovalData.partialStagingRoomData?.stagedRackNumber || 'Rack P-04'}</strong></div>
                <div>Cartons Staged: <strong style={{ color: '#0f172a' }}>{orderApprovalData.partialPackagingData?.cartonCount || 2} boxes</strong></div>
                <div>Total Net Order Value: <strong style={{ color: '#166534' }}>₹{Number(orderApprovalData.netAmount || 100000).toLocaleString()}</strong></div>
                <div>Advance Received: <strong style={{ color: '#166534' }}>₹{Number(orderApprovalData.advanceAmount || 50000).toLocaleString()}</strong></div>
              </div>
            </div>

            <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#065f46', marginBottom: '10px' }}>
                Partial Billing & Payment Clearance
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>
                    Invoice / Receipt Number
                  </label>
                  <input
                    type="text"
                    value={stageForm.partialInvoiceNo}
                    onChange={(e) => setStageForm({ ...stageForm, partialInvoiceNo: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>
                    Payment Mode
                  </label>
                  <select
                    value={stageForm.partialPaymentMode}
                    onChange={(e) => setStageForm({ ...stageForm, partialPaymentMode: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI / Digital Payment</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>
                    Partial Amount Verified (₹)
                  </label>
                  <input
                    type="number"
                    value={stageForm.partialAmountReceived}
                    onChange={(e) => setStageForm({ ...stageForm, partialAmountReceived: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '12px', padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#065f46' }}>
                  ✓ On submitting payment confirmation, this order will advance to <strong>COMPLETE Stage</strong> and automatically create new tasks for both Stock Room Manager and Production Lead.
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Accounts / Payment Clearance Notes (Mandatory if referring back)
              </label>
              <textarea
                rows={2}
                placeholder="Enter payment confirmation notes or transaction ID..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 6.A CASE: COMPLETE -> PRINTING */}
        {isCompletePrinting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0369a1', marginBottom: '10px' }}>
                Complete Bulk Printing Metrics
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                    Bulk Run Printed Quantity (pcs)
                  </label>
                  <input
                    type="number"
                    value={stageForm.completePrintedCount}
                    onChange={(e) => setStageForm({ ...stageForm, completePrintedCount: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                    Bulk Printing Status
                  </label>
                  <select
                    value={stageForm.completePrintingStatus}
                    onChange={(e) => setStageForm({ ...stageForm, completePrintingStatus: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  >
                    <option value="Complete">Complete (Ready for QC)</option>
                    <option value="Work in Progress">Work in Progress</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Bulk Printing Notes (Mandatory if referring back)
              </label>
              <textarea
                rows={2}
                placeholder="Enter complete bulk printing notes..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 6.B CASE: COMPLETE -> QUALITY CHECK */}
        {isCompleteQualityCheck && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#fefce8', padding: '14px 16px', borderRadius: '8px', border: '1px solid #fef08a' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#854d0e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#ca8a04" /> Verified Data from Complete Printing
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '12.5px', color: '#713f12' }}>
                <div>Bulk Pieces Printed: <strong style={{ color: '#0f172a' }}>{orderApprovalData.completePrintingData?.printedCount || orderApprovalData.totalQuantity || 100} pcs</strong></div>
                <div>Printing Status: <strong style={{ color: '#166534' }}>{orderApprovalData.completePrintingData?.printingStatus || 'Complete'}</strong></div>
              </div>
            </div>

            <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#b45309', marginBottom: '10px' }}>
                Final Bulk QC Standards
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#78350f' }}>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: '#d97706', transform: 'scale(1.2)' }} />
                  <span>100% final batch quality audit completed</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#78350f' }}>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: '#d97706', transform: 'scale(1.2)' }} />
                  <span>Zero-defect sign-off issued for bulk shipment</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>
                    Passed Units (pcs)
                  </label>
                  <input
                    type="number"
                    value={stageForm.completeQcPassedCount}
                    onChange={(e) => setStageForm({ ...stageForm, completeQcPassedCount: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>
                    Rejection Units (pcs)
                  </label>
                  <input
                    type="number"
                    value={stageForm.completeQcRejectedCount}
                    onChange={(e) => setStageForm({ ...stageForm, completeQcRejectedCount: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                QC Inspector Notes (Mandatory if referring back)
              </label>
              <textarea
                rows={2}
                placeholder="Enter final QC notes..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 6.C CASE: COMPLETE -> PACKAGING */}
        {isCompletePackaging && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#2563eb" /> Verified Data from Final QC
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
                <div>Final QC Passed: <strong style={{ color: '#166534' }}>{orderApprovalData.completeQualityCheckData?.passedCount || orderApprovalData.totalQuantity || 100} pcs</strong></div>
                <div>Final Rejection: <strong style={{ color: '#0f172a' }}>{orderApprovalData.completeQualityCheckData?.rejectedCount || 0} pcs</strong></div>
              </div>
            </div>

            <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1d4ed8', marginBottom: '10px' }}>
                Final Bulk Packaging Metrics
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                    Total Units Packed (pcs)
                  </label>
                  <input
                    type="number"
                    value={stageForm.completeUnitsPacked}
                    onChange={(e) => setStageForm({ ...stageForm, completeUnitsPacked: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                    Master Cartons Count (boxes)
                  </label>
                  <input
                    type="number"
                    value={stageForm.completeMasterCartonsCount}
                    onChange={(e) => setStageForm({ ...stageForm, completeMasterCartonsCount: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Packaging Notes (Mandatory if referring back)
              </label>
              <textarea
                rows={2}
                placeholder="Enter bulk packaging remarks..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 6.D CASE: COMPLETE -> DELIVERY PENDING */}
        {isCompleteDeliveryPending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#2563eb" /> Customer Delivery Destination Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
                <div>Client: <strong style={{ color: '#0f172a' }}>{orderApprovalData.clientName || 'Client'}</strong> ({orderApprovalData.companyName || '-'})</div>
                <div>Phone: <strong style={{ color: '#0f172a' }}>{orderApprovalData.phoneNumber || '-'}</strong></div>
                <div>Address: <strong>{orderApprovalData.companyAddress || '-'}, {orderApprovalData.state || ''} {orderApprovalData.pincode || ''}</strong></div>
                <div>Total Packed: <strong style={{ color: '#166534' }}>{orderApprovalData.completePackagingData?.totalUnitsPacked || orderApprovalData.totalQuantity || 100} pcs ({orderApprovalData.completePackagingData?.masterCartonsCount || 4} cartons)</strong></div>
              </div>
            </div>

            <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1d4ed8', marginBottom: '10px' }}>
                Logistics & Dispatch Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                    Logistics / Courier Partner
                  </label>
                  <input
                    type="text"
                    value={stageForm.completeCourierName}
                    onChange={(e) => setStageForm({ ...stageForm, completeCourierName: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                    Tracking AWB Number
                  </label>
                  <input
                    type="text"
                    value={stageForm.completeTrackingNumber}
                    onChange={(e) => setStageForm({ ...stageForm, completeTrackingNumber: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                    Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={stageForm.completeDispatchDate}
                    onChange={(e) => setStageForm({ ...stageForm, completeDispatchDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                    Driver / Courier Contact
                  </label>
                  <input
                    type="text"
                    value={stageForm.completeDriverPhone}
                    onChange={(e) => setStageForm({ ...stageForm, completeDriverPhone: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Dispatch Notes (Mandatory if referring back)
              </label>
              <textarea
                rows={2}
                placeholder="Enter dispatch and vehicle notes..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 6.E CASE: COMPLETE -> DELIVERED */}
        {isCompleteDelivered && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#16a34a" /> Transit & Dispatch Verification
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
                <div>Transporter: <strong style={{ color: '#0f172a' }}>{orderApprovalData.completeDeliveryPendingData?.courierName || 'Blue Dart Express'}</strong></div>
                <div>AWB Tracking: <strong style={{ color: '#0f172a' }}>{orderApprovalData.completeDeliveryPendingData?.trackingNumber || 'AWB-BD-882319'}</strong></div>
                <div>Dispatch Date: <strong>{orderApprovalData.completeDeliveryPendingData?.dispatchDate || 'Recent'}</strong></div>
                <div>Client Phone: <strong>{orderApprovalData.phoneNumber || '-'}</strong></div>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#15803d', marginBottom: '10px' }}>
                Proof of Delivery (POD) & Recipient Acknowledgment
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#15803d', marginBottom: '4px' }}>
                    Delivery Date / Timestamp
                  </label>
                  <input
                    type="date"
                    value={stageForm.completeDeliveryDate}
                    onChange={(e) => setStageForm({ ...stageForm, completeDeliveryDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#15803d', marginBottom: '4px' }}>
                    Received By (Person Name)
                  </label>
                  <input
                    type="text"
                    value={stageForm.completeReceivedBy}
                    onChange={(e) => setStageForm({ ...stageForm, completeReceivedBy: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#15803d', marginBottom: '4px' }}>
                    POD / Delivery Receipt #
                  </label>
                  <input
                    type="text"
                    value={stageForm.completePodNumber}
                    onChange={(e) => setStageForm({ ...stageForm, completePodNumber: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Delivery Confirmation Notes (Mandatory if referring back)
              </label>
              <textarea
                rows={2}
                placeholder="Enter delivery sign-off notes..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* 6.F CASE: COMPLETE -> CUSTOMER SUPPORT (Final step of Complete) */}
        {isCompleteCustomerSupport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#059669" /> End-to-End Production & Delivery Verification
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
                <div>Sample Stage: <strong style={{ color: '#166534' }}>✓ Approved by Client</strong></div>
                <div>Partial Stage: <strong style={{ color: '#166534' }}>✓ Paid & Fulfilled</strong></div>
                <div>Bulk Delivery: <strong style={{ color: '#166534' }}>✓ Delivered (POD: {orderApprovalData.completeDeliveredData?.podNumber || 'POD-99214'})</strong></div>
                <div>Received By: <strong>{orderApprovalData.completeDeliveredData?.receivedBy || orderApprovalData.clientName || 'Store Manager'}</strong></div>
              </div>
            </div>

            <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#065f46', marginBottom: '10px' }}>
                Customer Satisfaction & Order Final Sign-Off
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>
                    Customer Rating
                  </label>
                  <select
                    value={stageForm.completeClientRating}
                    onChange={(e) => setStageForm({ ...stageForm, completeClientRating: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  >
                    <option value="5">⭐⭐⭐⭐⭐ 5 Stars (Delighted)</option>
                    <option value="4">⭐⭐⭐⭐ 4 Stars (Satisfied)</option>
                    <option value="3">⭐⭐⭐ 3 Stars (Neutral)</option>
                    <option value="2">⭐⭐ 2 Stars (Needs Improvement)</option>
                    <option value="1">⭐ 1 Star (Unsatisfied)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>
                    Resolution & Fulfillment Status
                  </label>
                  <select
                    value={stageForm.completeSupportResolution}
                    onChange={(e) => setStageForm({ ...stageForm, completeSupportResolution: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  >
                    <option value="Delivered & Client Fully Satisfied">Delivered & Client Fully Satisfied</option>
                    <option value="Follow-up Required">Follow-up Required</option>
                    <option value="Issue Resolved">Issue Resolved</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Client Feedback / Testimonial Notes
              </label>
              <textarea
                rows={2}
                placeholder="Enter client testimonial or feedback notes..."
                value={stageForm.note}
                onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* Actions Toolbar on the page */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={() => handleExecuteStageTransition('refer_back')}
            disabled={submittingStageAction}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: submittingStageAction ? 'not-allowed' : 'pointer',
            }}
          >
            <RotateCcw size={15} />
            <span>Refer Back</span>
          </button>

          <button
            type="button"
            id="btn-stage-submit"
            onClick={() => handleExecuteStageTransition('submit')}
            disabled={submittingStageAction}
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '6px',
              background: isSamplePrinting
                ? stageForm.stageStatus === 'Work in Progress'
                  ? '#2563eb'
                  : stageForm.stageStatus === 'On Hold'
                  ? '#d97706'
                  : '#10b981'
                : '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '9px 22px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: submittingStageAction ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            <CheckCircle size={15} />
            <span>
              {submittingStageAction
                ? 'Processing...'
                : isCurrentStageApproved
                ? 'Update Verification & Remarks'
                : isSamplePrinting
                ? stageForm.stageStatus === 'Complete'
                  ? 'Submit (Move to Ready to Pick Up)'
                  : `Save as ${stageForm.stageStatus} (Stay in Printing)`
                : isSampleDtfPending
                ? 'Submit (Move to Stock)'
                : isSampleStock
                ? 'Submit (Move to Printing)'
                : isSampleReadyToPickup
                ? 'Submit (Move to Staging Ground)'
                : isSampleStagingGround
                ? 'Submit (Move to Customer Approval)'
                : isSampleCustomerApproval
                ? 'Approve Sample & Advance to Partial Stage'
                : isPartialPrinting
                ? stageForm.partialPrintingStatus === 'Complete'
                  ? 'Submit (Move to Quality Check)'
                  : `Save as ${stageForm.partialPrintingStatus} (Stay in Printing)`
                : isPartialQualityCheck
                ? 'Submit (Move to Packaging)'
                : isPartialPackaging
                ? 'Submit (Move to Partial - Staging Room)'
                : isPartialStagingRoom
                ? 'Submit (Move to Payment Confirmation)'
                : isPartialPaymentConfirmation
                ? 'Approve Partial & Advance to Complete Stage'
                : isCompletePrinting
                ? stageForm.completePrintingStatus === 'Complete'
                  ? 'Submit (Move to Quality Check)'
                  : `Save as ${stageForm.completePrintingStatus} (Stay in Printing)`
                : isCompleteQualityCheck
                ? 'Submit (Move to Packaging)'
                : isCompletePackaging
                ? 'Submit (Move to Delivery Pending)'
                : isCompleteDeliveryPending
                ? 'Submit (Move to Delivered)'
                : isCompleteDelivered
                ? 'Submit (Move to Customer Support)'
                : isCompleteCustomerSupport
                ? 'Complete & Archive Order'
                : 'Submit & Advance'}
            </span>
          </button>
        </div>
      </div>
    );
  };

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
    } else if (pathParts[1].toLowerCase() === 'customer-support') {
      currentStage = 'complete';
      currentSubStage = 'customer-support';
    } else {
      currentSubStage = pathParts[1].toLowerCase();
    }
  }

  const allStageLeads = leadsList.filter((item) => {
    // Profile orientation: each user only sees leads/orders created by or belonging to their employee profile
    const myName = (currentUser?.name || '').toLowerCase().trim();
    const myId = (currentUser?.id || '').toLowerCase().trim();
    const itemEmp = (item.employeeName || '').toLowerCase().trim();
    const itemCreatedBy = (item.createdBy || '').toLowerCase().trim();

    let isOwner = false;
    if (itemEmp && myName && (itemEmp === myName || itemEmp.includes(myName) || myName.includes(itemEmp))) {
      isOwner = true;
    } else if (itemCreatedBy && myId && itemCreatedBy === myId) {
      isOwner = true;
    } else if ((myName.startsWith('divyansh') || myId === 'sales') && (itemEmp.startsWith('divyansh') || itemEmp === 'sales executive' || itemCreatedBy === 'sales')) {
      isOwner = true;
    } else if ((myName.startsWith('marcus') || myId === 'production') && (itemEmp.startsWith('marcus') || itemCreatedBy === 'production')) {
      isOwner = true;
    } else if ((myName.startsWith('adam') || myId === 'admin') && (itemEmp.startsWith('adam') || itemCreatedBy === 'admin')) {
      isOwner = true;
    } else if ((myName.startsWith('elena') || myId === 'stock') && (itemEmp.startsWith('elena') || itemCreatedBy === 'stock')) {
      isOwner = true;
    }

    if (!isOwner) {
      return false;
    }

    const info = getLeadStageInfo(item, currentStage, currentSubStage);
    return info.matches;
  });

  const matchingLeads = allStageLeads.filter((item) => {
    if (stageFilterTab === 'all') return true;
    const info = getLeadStageInfo(item, currentStage, currentSubStage);
    if (stageFilterTab === 'pending') return info.status === 'in_progress';
    if (stageFilterTab === 'approved') return info.status === 'approved';
    return true;
  });

  const pendingCount = allStageLeads.filter((it) => getLeadStageInfo(it, currentStage, currentSubStage).status === 'in_progress').length;
  const approvedCount = allStageLeads.filter((it) => getLeadStageInfo(it, currentStage, currentSubStage).status === 'approved').length;
  const allCount = allStageLeads.length;

  useEffect(() => {
    if (editId && location.pathname !== '/order/create-lead') {
      navigate(`/order/create-lead?id=${editId}&from=${encodeURIComponent(location.pathname)}&stage=${encodeURIComponent(currentStage || 'sample')}`);
    }
  }, [editId, location.pathname, currentStage]);

  if (location.pathname === '/order/create-lead') {
    const fromUrl = searchParams.get('from') || '';
    let fromSub = '';
    if (fromUrl) {
      const match = fromUrl.match(/\/order\/(sample|partial|complete)\/([a-z0-9-]+)/);
      if (match && match[2]) {
        fromSub = match[2];
      }
    }
    const currentSub = (orderApprovalData?.subStage || 'order').toLowerCase().replace(/\s+/g, '-');
    let activeSub = fromSub || currentSub;
    if (fromUrl.includes('/customer-approval-awaiting')) activeSub = 'customer-approval-awaiting';
    else if (fromUrl.includes('/staging-ground')) activeSub = 'staging-ground';
    else if (fromUrl.includes('/ready-to-pick-up')) activeSub = 'ready-to-pick-up';
    else if (fromUrl.includes('/printing')) activeSub = 'printing';
    else if (fromUrl.includes('/stock')) activeSub = 'stock';
    else if (fromUrl.includes('/dtf-pending')) activeSub = 'dtf-pending';

    const isExecutionStageView = Boolean(
      editId && (
        activeSub === 'printing' ||
        activeSub === 'ready-to-pick-up' ||
        activeSub === 'staging-ground' ||
        activeSub === 'customer-approval-awaiting' ||
        activeSub === 'quality-check' ||
        activeSub === 'packaging' ||
        activeSub === 'staging-room' ||
        activeSub === 'payment-confirmation' ||
        activeSub === 'delivery-pending' ||
        activeSub === 'delivered' ||
        activeSub === 'customer-support'
      )
    );

    const isSamplePrinting = currentStage === 'sample' && activeSub === 'printing';

    return (
      <div className="dashboard-page">
        {editId ? (
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <button
              type="button"
              onClick={handleBackToOrder}
              className="back-to-order-btn"
            >
              <ArrowLeft size={18} />
              <span>Back to Order</span>
            </button>

            {/* Top Right Action Buttons opposite to Back to Order */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleExecuteStageTransition('refer_back')}
                disabled={submittingStageAction}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: submittingStageAction ? 'not-allowed' : 'pointer',
                }}
              >
                <RotateCcw size={15} />
                <span>Refer Back</span>
              </button>

              <button
                type="button"
                id="btn-stage-submit-top"
                onClick={() => handleExecuteStageTransition('submit')}
                disabled={submittingStageAction}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isSamplePrinting
                    ? stageForm.stageStatus === 'Work in Progress'
                      ? '#2563eb'
                      : stageForm.stageStatus === 'On Hold'
                      ? '#d97706'
                      : '#10b981'
                    : '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 22px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: submittingStageAction ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              >
                <CheckCircle size={15} />
                <span>
                  {submittingStageAction ? 'Processing...' : 'Submit'}
                </span>
              </button>
            </div>
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

          {/* Action Success Notification */}
          {actionSuccessMsg && (
            <div className="lead-approval-success-banner" style={{
              background: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '12px 18px',
              marginBottom: '16px',
              color: '#065f46',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle size={18} color="#059669" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Stage Clearance & Execution Workflow Card (Directly on the page) */}
          {editId && orderApprovalData && renderStageWorkflowCard()}

          {/* Lead Manager Decision & Actions on Top */}
          {editId && isLeadManagerOrAdmin && !isExecutionStageView && (
            <div className="lead-manager-top-actions" style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderLeft: isLeadSubmitted ? '4px solid #10b981' : leadAppr.status === 'Referred Back' ? '4px solid #ef4444' : '4px solid #f59e0b',
              borderRadius: '10px',
              padding: '16px 20px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              {leadAppr.note && (
                <div style={{
                  background: leadAppr.status === 'Referred Back' ? '#fff5f5' : '#f8fafc',
                  border: `1px solid ${leadAppr.status === 'Referred Back' ? '#fed7d7' : '#e2e8f0'}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#334155'
                }}>
                  <strong style={{ color: leadAppr.status === 'Referred Back' ? '#c53030' : '#475569' }}>
                    Previous Manager Note:
                  </strong>{' '}
                  "{leadAppr.note}"
                  {leadAppr.author && (
                    <span style={{ fontSize: '11.5px', color: '#64748b', marginLeft: '8px' }}>
                      — {leadAppr.author} {leadAppr.updatedAt ? `on ${new Date(leadAppr.updatedAt).toLocaleDateString()}` : ''}
                    </span>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <textarea
                  value={leadManagerNote}
                  onChange={(e) => setLeadManagerNote(e.target.value)}
                  placeholder="Additional note (mandatory with every refer back)..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => handleLeadManagerAction('Referred Back')}
                  disabled={submittingLeadAction}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: '#fff',
                    border: '1px solid #ef4444',
                    color: '#dc2626',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: submittingLeadAction ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RotateCcw size={15} />
                  <span>Refer Back</span>
                </button>

                {isLeadSubmitted ? (
                  <button
                    type="button"
                    disabled={true}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 22px',
                      borderRadius: '6px',
                      background: '#10b981',
                      border: 'none',
                      color: '#fff',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'not-allowed',
                      opacity: 0.95
                    }}
                    title="Order already submitted"
                  >
                    <CheckCircle size={15} />
                    <span>Submitted</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLeadManagerAction('Approved')}
                    disabled={submittingLeadAction}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 22px',
                      borderRadius: '6px',
                      background: '#059669',
                      border: 'none',
                      color: '#fff',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: submittingLeadAction ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <CheckCircle size={15} />
                    <span>{submittingLeadAction ? 'Submitting...' : 'Submit'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {editId && isOrderReferredBack && !isExecutionStageView && (
            <div className="referred-back-banner">
              <RotateCcw size={20} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>Action Required: Order Referred Back for Revisions.</strong>
                {leadAppr.status === 'Referred Back' && leadAppr.note && (
                  <div style={{
                    marginTop: '8px',
                    background: '#ffffff',
                    border: '1px solid #fecaca',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    color: '#991b1b',
                    fontSize: '13px'
                  }}>
                    <strong>Mandatory Note from Lead Manager ({leadAppr.author || 'Lead Manager'}):</strong> "{leadAppr.note}"
                  </div>
                )}
                <div style={{ marginTop: '6px', fontSize: '13px' }}>
                  Please review the manager notes in the clearance tasks below, adjust the required fields in this form, and click <strong>Submit</strong> to send back to Lead Manager for approval.
                </div>
              </div>
            </div>
          )}

          {!isExecutionStageView && (
            <form className="form-container" onSubmit={handleFormSubmit} ref={formRef}>
            <div className="form-section">
              <div className="form-section-title">Lead Form</div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Employee Name</label>
                  <input
                    type="text"
                    value={formData.employeeName !== undefined ? formData.employeeName : (editId && orderApprovalData?.employeeName ? orderApprovalData.employeeName : (currentUser?.name || ''))}
                    onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                    style={{ background: 'rgba(0,0,0,0.02)', color: '#0f172a' }}
                  />
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
              
              {!isSubmitted && !editId && !isLeadManager && (
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
                
                {!isLeadManager && (
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
                )}
              </div>
            )}
            
            </form>
          )}

          {/* TASK SECTION AFTER THE FORM IN ORDERS (Only in orders of sample, partial, and complete) */}
          {Boolean(editId) && !isExecutionStageView && (
            <div className="order-tasks-wrapper">
              <div className="tasks-section-header">
                <div className="tasks-section-title">Department Clearance Tasks</div>
                <p className="tasks-section-subtitle">
                  Review status and feedback from Lead Manager, Stock Room Manager, and Production Room Manager
                </p>
              </div>

              {/* Task 0 - Lead Manager */}
              <div className="order-task-card">
                <div className="task-col-left">
                  <div className="task-title">Task 0 - Lead Manager Clearance</div>
                  <div className="task-manager-subtitle">{leadAppr.author || 'Sarah Jenkins'} (Lead Manager)</div>
                </div>

                <div className="task-col-center">
                  <span className="task-status-label">Status</span>
                  <span
                    className={`task-status-pill ${
                      leadAppr.status === 'Approved'
                        ? 'approved'
                        : leadAppr.status === 'Referred Back'
                        ? 'referred'
                        : 'pending'
                    }`}
                  >
                    {leadAppr.status || 'Pending'}
                  </span>
                </div>

                <div className="task-col-right">
                  <span className="task-note-label">Lead Manager Notes</span>
                  {leadAppr.note ? (
                    <div
                      className={`task-note-content ${
                        leadAppr.status === 'Referred Back' ? 'referred' : ''
                      }`}
                    >
                      {leadAppr.note}
                    </div>
                  ) : (
                    <div className="task-note-placeholder">
                      {leadAppr.status === 'Approved'
                        ? 'Approved by Lead Manager'
                        : 'Awaiting Review'}
                    </div>
                  )}
                </div>
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

        {/* Stage Filter Tabs (All / Action Required / Approved & Advanced) */}
        {Boolean(currentSubStage && currentSubStage !== 'leads' && currentSubStage !== 'new') && (
          <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>Filter:</span>
            <button
              type="button"
              id="filter-tab-all"
              onClick={() => setStageFilterTab('all')}
              style={{
                padding: '5px 14px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: stageFilterTab === 'all' ? '#0f172a' : '#ffffff',
                color: stageFilterTab === 'all' ? '#ffffff' : '#64748b',
                boxShadow: stageFilterTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'inset 0 0 0 1px #e2e8f0',
                transition: 'all 0.15s',
              }}
            >
              All ({allCount})
            </button>
            <button
              type="button"
              id="filter-tab-pending"
              onClick={() => setStageFilterTab('pending')}
              style={{
                padding: '5px 14px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: stageFilterTab === 'pending' ? '#f59e0b' : '#ffffff',
                color: stageFilterTab === 'pending' ? '#ffffff' : '#64748b',
                boxShadow: stageFilterTab === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'inset 0 0 0 1px #e2e8f0',
                transition: 'all 0.15s',
              }}
            >
              Action Required ({pendingCount})
            </button>
            <button
              type="button"
              id="filter-tab-approved"
              onClick={() => setStageFilterTab('approved')}
              style={{
                padding: '5px 14px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: stageFilterTab === 'approved' ? '#10b981' : '#ffffff',
                color: stageFilterTab === 'approved' ? '#ffffff' : '#64748b',
                boxShadow: stageFilterTab === 'approved' ? '0 1px 3px rgba(0,0,0,0.1)' : 'inset 0 0 0 1px #e2e8f0',
                transition: 'all 0.15s',
              }}
            >
              Approved & Advanced ({approvedCount})
            </button>
          </div>
        )}

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
                  <th style={{ padding: '10px 12px' }}>Order ID</th>
                  <th style={{ padding: '10px 12px' }}>Company</th>
                  <th style={{ padding: '10px 12px' }}>Employee</th>
                  <th style={{ padding: '10px 12px' }}>Phone</th>
                  <th style={{ padding: '10px 12px' }}>Stage</th>
                  <th style={{ padding: '10px 12px' }}>Sub Stage</th>
                  <th style={{ padding: '10px 12px' }}>Stage Status</th>
                  {currentSubStage === 'printing' && <th style={{ padding: '10px 12px' }}>Printing Status</th>}
                  <th style={{ padding: '10px 12px' }}>Quantity</th>
                  <th style={{ padding: '10px 12px' }}>Clearance Status</th>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {matchingLeads.map((item) => {
                  const stageInfo = getLeadStageInfo(item, currentStage, currentSubStage);
                  const isActionRequired = stageInfo.status === 'in_progress';
                  return (
                    <tr
                      key={item._id}
                      id={`order-row-${item.orderId || item._id}`}
                      onClick={() => {
                        navigate(`/order/create-lead?id=${item._id}&from=${encodeURIComponent(location.pathname)}&stage=${encodeURIComponent(item.orderStage || 'sample')}`);
                      }}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      title="Click to open order lead"
                    >
                      <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>
                        {item.orderId || (item._id ? `ORD-${String(item._id).slice(-5).toUpperCase()}` : '—')}
                      </td>
                      <td style={{ padding: '12px', color: '#475569' }}>
                        {item.companyName || '—'}
                      </td>
                      <td style={{ padding: '12px', color: '#64748b' }}>
                        {item.employeeName || 'Sales Executive'}
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
                          {item.subStage === 'new' ? 'Leads' : (item.subStage || 'Leads').replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {stageInfo.status === 'approved' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#dcfce7',
                              color: '#15803d',
                            }}
                          >
                            <CheckCircle size={12} color="#16a34a" /> Approved & Advanced
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#fef3c7',
                              color: '#b45309',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }} />
                            In Progress
                          </span>
                        )}
                      </td>
                      {currentSubStage === 'printing' && (
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
                                (item.printingStageData?.printingStatus || 'Work in Progress') === 'Complete'
                                  ? '#d1fae5'
                                  : (item.printingStageData?.printingStatus || 'Work in Progress') === 'On Hold'
                                  ? '#ffedd5'
                                  : '#e0f2fe',
                              color:
                                (item.printingStageData?.printingStatus || 'Work in Progress') === 'Complete'
                                  ? '#065f46'
                                  : (item.printingStageData?.printingStatus || 'Work in Progress') === 'On Hold'
                                  ? '#c2410c'
                                  : '#0369a1',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor:
                                  (item.printingStageData?.printingStatus || 'Work in Progress') === 'Complete'
                                  ? '#059669'
                                  : (item.printingStageData?.printingStatus || 'Work in Progress') === 'On Hold'
                                  ? '#ea580c'
                                  : '#0284c7',
                              }}
                            />
                            {item.printingStageData?.printingStatus || 'Work in Progress'}
                          </span>
                        </td>
                      )}
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
                              (item.leadApproval?.status || item.approvalStatus) === 'Referred Back'
                                ? '#fee2e2'
                                : (item.leadApproval?.status || item.approvalStatus) === 'Approved'
                                ? '#d1fae5'
                                : '#fef3c7',
                            color:
                              (item.leadApproval?.status || item.approvalStatus) === 'Referred Back'
                                ? '#b91c1c'
                                : (item.leadApproval?.status || item.approvalStatus) === 'Approved'
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
                                (item.leadApproval?.status || item.approvalStatus) === 'Referred Back'
                                ? '#dc2626'
                                : (item.leadApproval?.status || item.approvalStatus) === 'Approved'
                                ? '#059669'
                                : '#d97706',
                            }}
                          />
                          {(item.leadApproval?.status || item.approvalStatus) === 'Approved'
                            ? 'Approved'
                            : (item.leadApproval?.status || item.approvalStatus) === 'Referred Back'
                            ? 'Referred Back'
                            : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#94a3b8', fontSize: '12px' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
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

export default OrderManagement;

