import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Plus, Trash2, ArrowLeft, RotateCcw, AlertCircle, CheckCircle2, Paperclip, Upload, FileText, Check, ShieldCheck, CheckCircle, Clock, Edit2, X, Eye, Package, Printer, Search, Settings, Save } from 'lucide-react';
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
  'Staging Room',
  'Customer Approval Awaiting'
];

const EMBROIDERY_SAMPLE_STAGES = [
  'Order',
  'Stock Dispatch',
  'Vendor Received',
  'Vendor Dispatch at Staging Room',
  'Delivery Pending',
  'Delivered',
  'Customer Support'
];

const INDIAN_STATES = [
  'ANDAMAN AND NICOBAR ISLANDS',
  'ANDHRA PRADESH',
  'ARUNACHAL PRADESH',
  'ASSAM',
  'BIHAR',
  'CHANDIGARH',
  'CHHATTISGARH',
  'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
  'DELHI',
  'GOA',
  'GUJARAT',
  'HARYANA',
  'HIMACHAL PRADESH',
  'JAMMU AND KASHMIR',
  'JHARKHAND',
  'KARNATAKA',
  'KERALA',
  'LADAKH',
  'LAKSHADWEEP',
  'MADHYA PRADESH',
  'MAHARASHTRA',
  'MANIPUR',
  'MEGHALAYA',
  'MIZORAM',
  'NAGALAND',
  'ODISHA',
  'PUDUCHERRY',
  'PUNJAB',
  'RAJASTHAN',
  'SIKKIM',
  'TAMIL NADU',
  'TELANGANA',
  'TRIPURA',
  'UTTAR PRADESH',
  'UTTARAKHAND',
  'WEST BENGAL'
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
    'Staging Room',
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

const isOrderEmbroidery = (order) => {
  if (!order) return false;
  if (String(order.printingType || '').toLowerCase().trim() === 'embroidery') return true;
  if (Array.isArray(order.items) && order.items.some((it) => String(it?.printingType || '').toLowerCase().trim() === 'embroidery')) return true;
  return false;
};

const getLeadStageInfo = (item, targetStage, targetSubStage, targetWorkflow = 'dtf') => {
  const normTargetStage = (targetStage || '').toLowerCase().trim();
  const normTargetSub = (targetSubStage || '').toLowerCase().trim().replace(/\s+/g, '-');
  const isEmb = isOrderEmbroidery(item);

  // If viewing Embroidery workflow
  if (targetWorkflow === 'embroidery') {
    if (!isEmb) return { matches: false, status: 'none', isCompleted: false };
    if (normTargetSub === 'all') {
      return { matches: true, status: 'in_progress', isCompleted: false };
    }
    if (normTargetSub === 'leads' || normTargetSub === 'new') {
      const isLead = (item.query || '').toLowerCase().trim() === 'lead';
      return { matches: isLead, status: 'in_progress', isCompleted: false };
    }
    if ((item.query || '').toLowerCase().trim() === 'lead') {
      return { matches: false, status: 'none', isCompleted: false };
    }
    if (normTargetSub === 'order') {
      const rawSub = (item.subStage || 'order').toLowerCase().trim();
      const isOrder = rawSub === 'order' || rawSub === 'new' || rawSub === 'leads' || !rawSub;
      return { matches: isOrder, status: item.approvalStatus === 'Approved' ? 'approved' : 'in_progress', isCompleted: item.approvalStatus === 'Approved' };
    }
    if (normTargetSub === 'stock-dispatch') {
      return { matches: (item.subStage || '').toLowerCase().trim() === 'stock-dispatch', status: 'in_progress', isCompleted: false };
    }
    if (normTargetSub === 'vendor-received') {
      return { matches: (item.subStage || '').toLowerCase().trim() === 'vendor-received', status: 'in_progress', isCompleted: false };
    }
    if (normTargetSub === 'vendor-dispatch-at-staging-room' || normTargetSub === 'staging-room' || normTargetSub === 'vendor-dispatch') {
      const rawSub = (item.subStage || '').toLowerCase().trim();
      return { matches: rawSub === 'vendor-dispatch-at-staging-room' || rawSub === 'staging-room' || rawSub === 'vendor-dispatch', status: 'in_progress', isCompleted: false };
    }
    if (normTargetSub === 'delivery-pending') {
      return { matches: (item.subStage || '').toLowerCase().trim() === 'delivery-pending', status: 'in_progress', isCompleted: false };
    }
    if (normTargetSub === 'delivered') {
      return { matches: (item.subStage || '').toLowerCase().trim() === 'delivered', status: 'in_progress', isCompleted: false };
    }
    if (normTargetSub === 'customer-support') {
      return { matches: (item.subStage || '').toLowerCase().trim() === 'customer-support', status: 'in_progress', isCompleted: false };
    }
    return { matches: true, status: 'in_progress', isCompleted: false };
  }

  const rawItemStage = (item.orderStage || 'sample').toLowerCase().trim();
  const itemStage = ['sample', 'partial', 'complete'].includes(rawItemStage) ? rawItemStage : 'sample';

  const rawItemSub = (item.subStage || 'order').toLowerCase().trim();
  let itemSub = rawItemSub.replace(/\s+/g, '-');
  if (itemSub === 'new' || itemSub === 'leads' || !itemSub) {
    itemSub = 'order';
  } else if (itemSub === 'dtf' || itemSub === 'dtf-pending-workspace') {
    itemSub = 'dtf-pending';
  }

  // Dedicated handling for Embroidery in DTF / Standard Order Management:
  // "But in the normal order management it will be there in the all only."
  if (isEmb) {
    if (normTargetSub === 'all') {
      const isLead = (item.query || '').toLowerCase().trim() === 'lead';
      if (!normTargetStage || normTargetStage === 'sample') {
        if (isLead || itemStage === 'sample') {
          return { matches: true, status: 'in_progress', isCompleted: false };
        }
        return { matches: false, status: 'none', isCompleted: false };
      }
      if (isLead) return { matches: false, status: 'none', isCompleted: false };
      if (itemStage === normTargetStage) {
        return { matches: true, status: 'in_progress', isCompleted: false };
      }
      return { matches: false, status: 'none', isCompleted: false };
    }
    if ((normTargetSub === 'leads' || normTargetSub === 'new') && (item.query || '').toLowerCase().trim() === 'lead') {
      return { matches: true, status: 'in_progress', isCompleted: false };
    }
    // Excluded from DTF Pending, Stock, Printing, etc. under normal order management
    return { matches: false, status: 'none', isCompleted: false };
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
    const isLead = (item.query || '').toLowerCase().trim() === 'lead';
    return { matches: isLead, status: 'in_progress', isCompleted: false };
  }

  // If viewing All tab (/order/all or /order/sample/all, /order/partial/all, /order/complete/all)
  if (normTargetSub === 'all') {
    const isLead = (item.query || '').toLowerCase().trim() === 'lead';
    if (!normTargetStage || normTargetStage === 'sample') {
      if (isLead || itemStage === 'sample') {
        return { matches: true, status: 'in_progress', isCompleted: false };
      }
      return { matches: false, status: 'none', isCompleted: false };
    }
    if (isLead) return { matches: false, status: 'none', isCompleted: false };
    if (itemStage === normTargetStage) {
      return { matches: true, status: 'in_progress', isCompleted: false };
    }
    return { matches: false, status: 'none', isCompleted: false };
  }

  // Exclude pure leads (query === 'lead') from appearing in order stage views
  if ((item.query || '').toLowerCase().trim() === 'lead') {
    return { matches: false, status: 'none', isCompleted: false };
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
    } else if (normTargetSub === 'staging-ground' || normTargetSub === 'staging-room') {
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
  '/order/sample/staging-room': 'Staging Room',
  '/order/sample/staging-ground': 'Staging Room',
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

  // Embroidery child routes
  '/order/embroidery/all': 'All',
  '/order/embroidery/leads': 'Leads',
  '/order/embroidery/sample/all': 'All',
  '/order/embroidery/sample/order': 'Order',
  '/order/embroidery/sample/stock-dispatch': 'Stock Dispatch',
  '/order/embroidery/sample/vendor-received': 'Vendor Received',
  '/order/embroidery/sample/vendor-dispatch-at-staging-room': 'Vendor Dispatch at Staging Room',
  '/order/embroidery/sample/vendor-dispatch': 'Vendor Dispatch at Staging Room',
  '/order/embroidery/sample/staging-room': 'Vendor Dispatch at Staging Room',
  '/order/embroidery/sample/delivery-pending': 'Delivery Pending',
  '/order/embroidery/sample/delivered': 'Delivered',
  '/order/embroidery/sample/customer-support': 'Customer Support',
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
  const logoDesignInputRef = useRef(null);
  const digitalDesignInputRef = useRef(null);

  const isCustomerSupport = location.pathname === '/order/customer-support';

  const [query, setQuery] = useState('lead');
  const [queryStatus, setQueryStatus] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [items, setItems] = useState([]);
  const [selectedStage, setSelectedStage] = useState('New');
  const [orderStage, setOrderStage] = useState('sample');
  const [subStage, setSubStage] = useState('order');
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    setIsEditing(searchParams.get('edit') === 'true');
  }, [searchParams]);

  const isReadOnly = isLeadManager ? true : Boolean(editId && !isEditing);

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
    logoDesign: '',
    logoDesignName: '',
    logoDesignFiles: [],
    digitalDesign: '',
    digitalDesignName: '',
    digitalDesignFiles: [],
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
  const [loadingLeads, setLoadingLeads] = useState(() => location.pathname !== '/order/create-lead');
  const [orderApprovalData, setOrderApprovalData] = useState(null);
  const [activeActivityTab, setActiveActivityTab] = useState('department');
  const [tableSearch, setTableSearch] = useState('');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const columnSettingsRef = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState({
    orderId: true,
    companyName: true,
    employeeName: true,
    phoneNumber: true,
    orderStage: true,
    subStage: true,
    stageStatus: true,
    printingStatus: true,
    totalQuantity: true,
    clearanceStatus: true,
    createdAt: true,
    action: true,
    query: false,
    clientName: false,
    companyAddress: false,
    state: false,
    pincode: false,
    repeatedOrder: false,
    additionalNote: false,
    logoName: false,
    pricePerPiece: false,
    totalAmount: false,
    gst: false,
    netAmount: false,
    advanceAmount: false,
    pendingAmount: false,
    urgency: false,
    deliveryDate: false,
    modeOfDelivery: false,
    items: false,
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (columnSettingsRef.current && !columnSettingsRef.current.contains(e.target)) {
        setShowColumnSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [stageForm, setStageForm] = useState({
    // Sample
    stageStatus: 'Work in Progress',
    tshirtsOnHoldCount: '',
    logosOnHoldCount: '',
    stockSampleReceived: '',
    stockSampleNotReceivedCount: '',
    prodSampleReceived: '',
    prodSampleNotReceivedCount: '',
    itemPrinted: 'yes',
    printedCount: 1,
    receivedCount: 1,
    readyToPickupCount: 1,
    printingSampleReceived: '',
    printingSampleNotReceivedCount: '',
    sampleRequirementMatch: true,
    stagingCount: 1,
    readyToPickSampleReceived: '',
    readyToPickSampleNotReceivedCount: '',
    rackNo: '',
    orderRequirementMatch: true,
    customerApproved: '',
    customerRequirementsMatch: true,
    paymentStatus: '',
    amountPaid: '',
    amountReceived: '',
    balanceRemaining: '',
    
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

  const fetchAllLeads = () => {
    api.get('/api/leads')
      .then((res) => {
        if (res.data?.data) {
          setLeadsList(res.data.data);
        }
      })
      .catch((err) => console.error('Error fetching leads:', err));
  };

  const handleFileChange = (field, nameField, e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    const filesKey = `${field}Files`;
    const existingFiles = Array.isArray(formData[filesKey]) ? formData[filesKey] : [];

    if (existingFiles.length + selectedFiles.length > 5) {
      alert('You can upload a maximum of 5 files.');
      if (e.target) e.target.value = '';
      return;
    }

    for (const file of selectedFiles) {
      if (file.size > 8 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 8MB limit.`);
        if (e.target) e.target.value = '';
        return;
      }
    }

    Promise.all(
      selectedFiles.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ data: reader.result, name: file.name });
            reader.readAsDataURL(file);
          })
      )
    ).then((loadedFiles) => {
      setFormData((prev) => {
        const prevArr = Array.isArray(prev[filesKey]) ? prev[filesKey] : [];
        const updatedArr = [...prevArr, ...loadedFiles].slice(0, 5);
        const first = updatedArr[0] || { data: '', name: '' };
        return {
          ...prev,
          [filesKey]: updatedArr,
          [field]: first.data,
          [nameField]: first.name,
          ...(field === 'logoDesign' ? { attachment: first.data, attachmentName: first.name } : {}),
        };
      });
      if (e.target) e.target.value = '';
    });
  };

  const handleRemoveFile = (field, nameField, ref, indexToRemove) => {
    const filesKey = `${field}Files`;
    setFormData((prev) => {
      const prevArr = Array.isArray(prev[filesKey]) ? prev[filesKey] : [];
      const updatedArr =
        typeof indexToRemove === 'number'
          ? prevArr.filter((_, idx) => idx !== indexToRemove)
          : [];
      const first = updatedArr[0] || { data: '', name: '' };
      return {
        ...prev,
        [filesKey]: updatedArr,
        [field]: first.data,
        [nameField]: first.name,
        ...(field === 'logoDesign' ? { attachment: first.data, attachmentName: first.name } : {}),
      };
    });
    if (ref?.current) {
      ref.current.value = '';
    }
  };

  const handleAttachmentChange = (e) => handleFileChange('logoDesign', 'logoDesignName', e);

  const handleRemoveAttachment = () => handleRemoveFile('logoDesign', 'logoDesignName', logoDesignInputRef);

  const resetFormToCurrentOrder = () => {
    if (orderApprovalData) {
      const d = orderApprovalData;
      setFormData({
        companyName: d.companyName || '',
        clientName: d.clientName || '',
        companyAddress: d.companyAddress || '',
        state: d.state ? String(d.state).toUpperCase() : '',
        pincode: d.pincode || '',
        phoneNumber: d.phoneNumber || '',
        repeatedOrder: d.repeatedOrder || 'No',
        scheduleDate: d.scheduleDate || '',
        scheduleTime: d.scheduleTime || '',
        additionalNote: d.additionalNote || '',
        orderId: d.orderId || '',
        logoDesign: d.logoDesign || d.attachment || '',
        logoDesignName: d.logoDesignName || d.attachmentName || '',
        logoDesignFiles: Array.isArray(d.logoDesignFiles) && d.logoDesignFiles.length > 0
          ? d.logoDesignFiles
          : (d.logoDesign || d.attachment ? [{ data: d.logoDesign || d.attachment, name: d.logoDesignName || d.attachmentName || 'File 1' }] : []),
        digitalDesign: d.digitalDesign || '',
        digitalDesignName: d.digitalDesignName || '',
        digitalDesignFiles: Array.isArray(d.digitalDesignFiles) && d.digitalDesignFiles.length > 0
          ? d.digitalDesignFiles
          : (d.digitalDesign ? [{ data: d.digitalDesign, name: d.digitalDesignName || 'File 1' }] : []),
        attachment: d.attachment || d.logoDesign || '',
        attachmentName: d.attachmentName || d.logoDesignName || '',
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
      setOrderStage(d.orderStage || 'sample');
      setSubStage(d.subStage || 'order');
      setItems(d.items || []);
      const q = (d.query || 'lead').toLowerCase().trim();
      setQuery(q);
      setIsSubmitted(q === 'order');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    resetFormToCurrentOrder();
  };

  const handleSaveExistingOrder = async () => {
    if (isLeadManager) {
      alert('Lead Manager cannot edit order forms.');
      return;
    }
    const phone = (formData.phoneNumber || '').trim();
    if (!/^\d{10}$/.test(phone)) {
      setPhoneTouched(true);
      alert('Phone number must be of 10 digits.');
      return;
    }

    const isLeadQuery = (query || '').toLowerCase().trim() === 'lead';
    if (!isLeadQuery) {
      if (
        !(formData.companyName || '').trim() ||
        !(formData.clientName || '').trim() ||
        !(formData.companyAddress || '').trim() ||
        !(formData.state || '').trim() ||
        !(formData.pincode || '').trim()
      ) {
        alert('Please fill in all mandatory fields: Company Name, Client Name, Company Address, State, and Pincode.');
        return;
      }

      const totalQty = Number(formData.totalQuantity);
      if (!formData.totalQuantity || isNaN(totalQty) || totalQty <= 0) {
        alert('Please enter a valid Total Quantity (pcs).');
        return;
      }

      if (
        formData.pricePerPiece === '' ||
        formData.totalAmount === '' ||
        formData.netAmount === '' ||
        formData.advanceAmount === '' ||
        formData.pendingAmount === '' ||
        !(formData.urgency || '').trim() ||
        !(formData.deliveryDate || '').trim()
      ) {
        alert('Please fill in all mandatory Order Information fields (Price Per Piece, Total Amount, Net Amount, Advance Amount, Pending Amount, Urgency, and Delivery Date).');
        return;
      }

      if (items.length === 0) {
        alert('Please add at least one item using "Add Item".');
        return;
      }

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const itemVal = (it.item || it.enterItem || '').trim();
        if (!itemVal || !(it.fabric || '').trim() || !it.quantity || Number(it.quantity) <= 0 || !(it.size || '').trim() || !(it.color || '').trim()) {
          alert(`Please fill in all mandatory fields for Item #${i + 1} (Item, Fabric, Quantity, Size, and Color).`);
          return;
        }
      }

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
      const currentEmpName = formData.employeeName || (editId && orderApprovalData?.employeeName ? orderApprovalData.employeeName : (currentUser?.name || 'Sales Executive'));
      const wasLeadBefore = (orderApprovalData?.query || 'lead').toLowerCase().trim() !== 'order';
      const payload = {
        _id: editId,
        employeeName: currentEmpName,
        createdBy: currentUser?.id || 'sales',
        performedBy: currentUser?.name || currentEmpName,
        performedByRole: currentUser?.role || 'Sales Executive',
        performedById: currentUser?.id || 'sales',
        logAction: (wasLeadBefore && !isLeadQuery)
          ? 'Lead Converted to Order & Submitted'
          : (isLeadQuery ? 'Lead Edited' : 'Order Edited'),
        query: isLeadQuery ? 'lead' : 'order',
        queryStatus,
        orderStage: isLeadQuery ? '' : (orderStage || 'sample'),
        subStage: isLeadQuery ? 'leads' : (subStage || 'order'),
        ...formData,
        employeeName: currentEmpName,
        orderId: formData.orderId,
        items,
      };
      const res = await api.post('/api/leads', payload);
      alert(isLeadQuery ? 'Lead updated successfully!' : 'Order updated successfully!');
      if (res.data?.data) {
        setOrderApprovalData(res.data.data);
      }
      setIsEditing(false);
      if (!isLeadQuery && searchParams.get('from')?.includes('/order/leads')) {
        const targetStage = orderStage || 'sample';
        const targetSub = !subStage || subStage === 'new' || subStage === 'leads' ? 'order' : subStage.replace(/\s+/g, '-');
        navigate(`/order/${targetStage}/${targetSub}`);
      }
    } catch (err) {
      console.error('Error updating order:', err);
      alert('Failed to update: ' + (err.response?.data?.message || err.message));
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
          ? `Order #${res.data.data?.orderId || 'Order'} approved successfully! Moved to next stage (${(res.data.data?.subStage || 'dtf-pending').replace(/-/g, ' ').toUpperCase()}).`
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
              const printingData = d.printingStageData || {};
              const readyPickupData = d.sampleReadyToPickUpData || {};
              const stagingGroundData = d.sampleStagingGroundData || {};
              const customerData = d.customerApprovalData || {};
              const initialStockReceived = printingData.stockSampleReceived !== undefined ? printingData.stockSampleReceived : '';
              const initialProdReceived = printingData.prodSampleReceived !== undefined ? printingData.prodSampleReceived : '';
              const initialPrintingReceived = readyPickupData.printingSampleReceived !== undefined ? readyPickupData.printingSampleReceived : '';
              const initialReadyToPickReceived = stagingGroundData.readyToPickSampleReceived !== undefined ? stagingGroundData.readyToPickSampleReceived : '';
              let initialCustomerApproved = '';
              if (customerData.customerApproved === true || customerData.customerApproved === 'yes') {
                initialCustomerApproved = 'yes';
              } else if (customerData.customerApproved === false || customerData.customerApproved === 'no') {
                initialCustomerApproved = 'no';
              }

              const initialPaymentStatus = customerData.paymentStatus || '';
              const totalOrderAmount = Number(d.netAmount || d.totalAmount || 0);
              let initialAmountReceived = customerData.amountReceived !== undefined ? customerData.amountReceived : (customerData.amountPaid || d.advanceAmount || '');
              let initialBalanceRemaining = customerData.balanceRemaining !== undefined ? customerData.balanceRemaining : '';
              if (initialBalanceRemaining === '' && totalOrderAmount > 0 && initialAmountReceived !== '') {
                initialBalanceRemaining = Math.max(0, totalOrderAmount - Number(initialAmountReceived));
              }

              const printingPickupCount = printingData.readyToPickupCount || printingData.printedCount || sampleCount || 1;
              
              let initialStageStatus = printingData.printingStatus;
              if (fromUrl.includes('/customer-approval-awaiting')) {
                if (initialCustomerApproved === 'no') {
                  initialStageStatus = 'On Hold';
                } else if (initialCustomerApproved === 'yes') {
                  initialStageStatus = 'Complete';
                } else {
                  initialStageStatus = customerData.stageStatus || 'Work in Progress';
                }
              } else if (fromUrl.includes('/staging-ground') || fromUrl.includes('/staging-room')) {
                if (initialReadyToPickReceived === 'no') {
                  initialStageStatus = 'On Hold';
                } else if (initialReadyToPickReceived === 'yes') {
                  initialStageStatus = 'Complete';
                } else {
                  initialStageStatus = stagingGroundData.stagingStatus || 'Work in Progress';
                }
              } else if (fromUrl.includes('/ready-to-pick-up')) {
                if (initialPrintingReceived === 'no') {
                  initialStageStatus = 'On Hold';
                } else if (initialPrintingReceived === 'yes') {
                  initialStageStatus = 'Complete';
                } else {
                  initialStageStatus = readyPickupData.pickupStatus || 'Work in Progress';
                }
              } else if (!initialStageStatus) {
                if (initialStockReceived === 'no' || initialProdReceived === 'no') {
                  initialStageStatus = 'On Hold';
                } else if (initialStockReceived === 'yes' && initialProdReceived === 'yes') {
                  initialStageStatus = 'Complete';
                } else {
                  initialStageStatus = 'Work in Progress';
                }
              }

              setStageForm({
                // Sample
                stageStatus: initialStageStatus,
                tshirtsOnHoldCount: printingData.tshirtsOnHoldCount !== undefined ? printingData.tshirtsOnHoldCount : '',
                logosOnHoldCount: printingData.logosOnHoldCount !== undefined ? printingData.logosOnHoldCount : '',
                stockSampleReceived: initialStockReceived,
                stockSampleNotReceivedCount: printingData.stockSampleNotReceivedCount || '',
                prodSampleReceived: initialProdReceived,
                prodSampleNotReceivedCount: printingData.prodSampleNotReceivedCount || '',
                itemPrinted: printingData.itemPrinted || 'yes',
                printedCount: printingData.printedCount !== undefined ? printingData.printedCount : (printingData.receivedCount || sampleCount),
                receivedCount: printingData.receivedCount || sampleCount,
                readyToPickupCount: readyPickupData.readyToPickupCount || readyPickupData.verifiedPickupCount || printingPickupCount,
                printingSampleReceived: initialPrintingReceived,
                printingSampleNotReceivedCount: readyPickupData.printingSampleNotReceivedCount || '',
                sampleRequirementMatch: readyPickupData.sampleRequirementMatch !== false,
                stagingCount: readyPickupData.readyToPickupCount || readyPickupData.verifiedPickupCount || printingPickupCount,
                readyToPickSampleReceived: initialReadyToPickReceived,
                readyToPickSampleNotReceivedCount: stagingGroundData.readyToPickSampleNotReceivedCount || '',
                rackNo: stagingGroundData.rackNo || stagingGroundData.stagedRackNumber || '',
                orderRequirementMatch: stagingGroundData.orderRequirementMatch !== false,
                customerApproved: initialCustomerApproved,
                customerRequirementsMatch: customerData.customerRequirementsMatch !== false,
                paymentStatus: initialPaymentStatus,
                amountPaid: initialAmountReceived,
                amountReceived: initialAmountReceived,
                balanceRemaining: initialBalanceRemaining,

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
              setOrderStage(d.orderStage || 'sample');
              setSubStage(d.subStage || 'order');
              setItems(d.items || []);
              setFormData({
                employeeName: d.employeeName || '',
                companyName: d.companyName || '',
                clientName: d.clientName || '',
                companyAddress: d.companyAddress || '',
                state: d.state ? String(d.state).toUpperCase() : '',
                pincode: d.pincode || '',
                phoneNumber: d.phoneNumber || '',
                repeatedOrder: d.repeatedOrder || 'No',
                scheduleDate: d.scheduleDate || '',
                scheduleTime: d.scheduleTime || '',
                additionalNote: d.additionalNote || '',
                orderId: d.orderId || '',
                logoDesign: d.logoDesign || d.attachment || '',
                logoDesignName: d.logoDesignName || d.attachmentName || '',
                logoDesignFiles: Array.isArray(d.logoDesignFiles) && d.logoDesignFiles.length > 0
                  ? d.logoDesignFiles
                  : (d.logoDesign || d.attachment ? [{ data: d.logoDesign || d.attachment, name: d.logoDesignName || d.attachmentName || 'File 1' }] : []),
                digitalDesign: d.digitalDesign || '',
                digitalDesignName: d.digitalDesignName || '',
                digitalDesignFiles: Array.isArray(d.digitalDesignFiles) && d.digitalDesignFiles.length > 0
                  ? d.digitalDesignFiles
                  : (d.digitalDesign ? [{ data: d.digitalDesign, name: d.digitalDesignName || 'File 1' }] : []),
                attachment: d.attachment || d.logoDesign || '',
                attachmentName: d.attachmentName || d.logoDesignName || '',
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
              setIsSubmitted(q === 'order');
              if (!d.orderId) {
                api.get('/api/leads/next-order-id')
                  .then((idRes) => {
                    if (idRes.data?.nextOrderId) {
                      setFormData((prev) => ({
                        ...prev,
                        orderId: prev.orderId || idRes.data.nextOrderId,
                      }));
                    }
                  })
                  .catch(() => {});
              }
            }
          })
          .catch((err) => console.error('Error loading lead for edit:', err));
      } else {
        setOrderApprovalData(null);
        setQuery('lead');
        setQueryStatus('');
        setOrderStage('sample');
        setSubStage('order');
        setItems([]);
        setIsSubmitted(false);
        setIsEditing(false);
        setPhoneTouched(false);
        setFormData({
          employeeName: currentUser?.name || '',
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
          logoDesign: '',
          logoDesignName: '',
          logoDesignFiles: [],
          digitalDesign: '',
          digitalDesignName: '',
          digitalDesignFiles: [],
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
        api.get('/api/leads/next-order-id')
          .then((res) => {
            if (res.data?.nextOrderId) {
              setFormData((prev) => ({
                ...prev,
                orderId: prev.orderId || res.data.nextOrderId,
              }));
            }
          })
          .catch(() => {});
      }
    }
  }, [location.pathname, editId]);

  // Fetch leads list for stage and sub-stage table visibility
  useEffect(() => {
    if (location.pathname !== '/order/create-lead') {
      setLoadingLeads((prev) => (leadsList.length === 0 ? true : prev));
      api.get('/api/leads')
        .then((res) => {
          if (res.data?.data) {
            setLeadsList(res.data.data);
          }
        })
        .catch((err) => console.error('Error fetching leads:', err))
        .finally(() => setLoadingLeads(false));
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
      if (from.startsWith('/order/embroidery/sample') || from.startsWith('/order/sample')) return 'sample';
      if (from.startsWith('/order/partial')) return 'partial';
      if (from.startsWith('/order/complete')) return 'complete';
    }
    if (location.pathname.startsWith('/order/embroidery/sample') || location.pathname.startsWith('/order/sample')) return 'sample';
    if (location.pathname.startsWith('/order/partial')) return 'partial';
    if (location.pathname.startsWith('/order/complete')) return 'complete';
    if (editId) return 'sample';
    return '';
  };

  const getCurrentStages = () => {
    const isEmbroideryUrl = location.pathname.startsWith('/order/embroidery') || searchParams.get('from')?.startsWith('/order/embroidery');
    if (isEmbroideryUrl) {
      return EMBROIDERY_SAMPLE_STAGES;
    }
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
    } else if ((query || '').toLowerCase().trim() === 'lead') {
      navigate('/order/leads');
    } else if (isLeadManager) {
      navigate('/approvals');
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
    if (isLeadManager && editId) {
      alert('Lead Manager cannot edit order forms.');
      return;
    }
    const phone = (formData.phoneNumber || '').trim();
    if (!/^\d{10}$/.test(phone)) {
      setPhoneTouched(true);
      alert('Phone number must be of 10 digits.');
      return;
    }
    const action = e.nativeEvent?.submitter?.name;
    if (action === 'save') {
      try {
        const isLeadQuery = (query || 'lead').toLowerCase().trim() === 'lead';
        const currentEmpName = formData.employeeName || (editId && orderApprovalData?.employeeName ? orderApprovalData.employeeName : (currentUser?.name || 'Sales Executive'));
        const payload = {
          employeeName: currentEmpName,
          createdBy: currentUser?.id || 'sales',
          performedBy: currentUser?.name || currentEmpName,
          performedByRole: currentUser?.role || 'Sales Executive',
          performedById: currentUser?.id || 'sales',
          logAction: editId ? 'Lead Edited & Saved' : 'Lead Created & Saved',
          query: query || 'lead',
          queryStatus,
          orderStage: isLeadQuery ? '' : orderStage,
          subStage: isLeadQuery ? 'leads' : subStage,
          ...formData,
          employeeName: currentEmpName,
          items,
        };
        if (editId) payload._id = editId;
        await api.post('/api/leads', payload);
        alert('Lead saved successfully!');
        const from = searchParams.get('from');
        if (from) {
          navigate(from);
        } else if (isLeadQuery) {
          navigate('/order/leads');
        } else if (orderStage) {
          const target = !subStage || subStage === 'new' || subStage === 'leads' ? 'order' : subStage.replace(/\s+/g, '-');
          navigate(`/order/${orderStage}/${target}`);
        } else {
          navigate('/order/leads');
        }
      } catch (err) {
        console.error('Error saving lead:', err);
        alert('Failed to save lead: ' + (err.response?.data?.message || err.message));
      }
    } else if (action === 'submit') {
      const isLeadQuery = (query || 'lead').toLowerCase().trim() === 'lead';
      if (isLeadQuery) {
        try {
          const currentEmpName = formData.employeeName || (editId && orderApprovalData?.employeeName ? orderApprovalData.employeeName : (currentUser?.name || 'Sales Executive'));
          const payload = {
            employeeName: currentEmpName,
            createdBy: currentUser?.id || 'sales',
            performedBy: currentUser?.name || currentEmpName,
            performedByRole: currentUser?.role || 'Sales Executive',
            performedById: currentUser?.id || 'sales',
            logAction: editId ? 'Lead Edited & Submitted to Leads' : 'Lead Created & Submitted to Leads',
            query: 'lead',
            queryStatus,
            orderStage: '',
            subStage: 'leads',
            ...formData,
            employeeName: currentEmpName,
            items,
          };
          if (editId) payload._id = editId;
          await api.post('/api/leads', payload);
          alert('Lead saved successfully!');
          navigate('/order/leads');
        } catch (err) {
          console.error('Error saving lead:', err);
          alert('Failed to save lead: ' + (err.response?.data?.message || err.message));
        }
        return;
      }
      if (
        !(formData.companyName || '').trim() ||
        !(formData.clientName || '').trim() ||
        !(formData.companyAddress || '').trim() ||
        !(formData.state || '').trim() ||
        !(formData.pincode || '').trim()
      ) {
        alert('Please fill in all mandatory fields: Company Name, Client Name, Company Address, State, and Pincode.');
        return;
      }
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
      await handleSaveExistingOrder();
      return;
    }
    const phone = (formData.phoneNumber || '').trim();
    if (!/^\d{10}$/.test(phone)) {
      setPhoneTouched(true);
      alert('Phone number must be of 10 digits.');
      return;
    }

    if (
      !(formData.companyName || '').trim() ||
      !(formData.clientName || '').trim() ||
      !(formData.companyAddress || '').trim() ||
      !(formData.state || '').trim() ||
      !(formData.pincode || '').trim()
    ) {
      alert('Please fill in all mandatory fields: Company Name, Client Name, Company Address, State, and Pincode.');
      return;
    }

    const totalQty = Number(formData.totalQuantity);
    if (!formData.totalQuantity || isNaN(totalQty) || totalQty <= 0) {
      alert('Please enter a valid Total Quantity (pcs).');
      return;
    }

    if (
      formData.pricePerPiece === '' ||
      formData.totalAmount === '' ||
      formData.netAmount === '' ||
      formData.advanceAmount === '' ||
      formData.pendingAmount === '' ||
      !(formData.urgency || '').trim() ||
      !(formData.deliveryDate || '').trim()
    ) {
      alert('Please fill in all mandatory Order Information fields (Price Per Piece, Total Amount, Net Amount, Advance Amount, Pending Amount, Urgency, and Delivery Date).');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one item using "Add Item".');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itemVal = (it.item || it.enterItem || '').trim();
      if (!itemVal || !(it.fabric || '').trim() || !it.quantity || Number(it.quantity) <= 0 || !(it.size || '').trim() || !(it.color || '').trim()) {
        alert(`Please fill in all mandatory fields for Item #${i + 1} (Item, Fabric, Quantity, Size, and Color).`);
        return;
      }
    }

    if (itemsTotalQty > totalQty) {
      alert(`Validation Error: Total quantity in "Add Item" (${itemsTotalQty} pcs) cannot be greater than Total Quantity (${totalQty} pcs). Sum of items must equal Total Quantity (${totalQty} === ${totalQty}).`);
      return;
    }
    if (itemsTotalQty !== totalQty) {
      alert(`Validation Error: Total quantity in "Add Item" (${itemsTotalQty} pcs) must equal Total Quantity (${totalQty} pcs). (${totalQty} === ${itemsTotalQty})`);
      return;
    }
    try {
      let finalOrderId = formData.orderId;
      if (!finalOrderId) {
        try {
          const idRes = await api.get('/api/leads/next-order-id');
          if (idRes.data?.nextOrderId) finalOrderId = idRes.data.nextOrderId;
        } catch (_) {}
      }
      const currentEmpName = formData.employeeName || (currentUser?.name || 'Sales Executive');
      const payload = {
        employeeName: currentEmpName,
        createdBy: currentUser?.id || 'sales',
        performedBy: currentUser?.name || currentEmpName,
        performedByRole: currentUser?.role || 'Sales Executive',
        performedById: currentUser?.id || 'sales',
        logAction: 'Order Created & Submitted',
        query: 'order',
        queryStatus,
        orderStage: orderStage || 'sample',
        subStage: subStage || 'order',
        ...formData,
        employeeName: currentEmpName,
        orderId: finalOrderId || formData.orderId,
        items,
        approvalStatus: 'Pending',
        leadApproval: {
          status: 'Pending',
          note: '',
          author: '',
          resubmittedAt: null,
        },
      };
      await api.post('/api/leads', payload);
      alert('Order submitted successfully!\nSent to Lead Manager for approval.');
      setIsSubmitted(false);
      setItems([]);
      setQuery('lead');
      setQueryStatus('');
      setOrderStage('sample');
      setSubStage('order');
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

  const formatPrintingType = (pt) => {
    if (!pt) return '-';
    const s = String(pt).trim();
    if (s.toLowerCase() === 'dtf') return 'DTF';
    if (s.toLowerCase() === 'sublimation') return 'Sublimation';
    if (s.toLowerCase() === 'embroidery') return 'Embroidery';
    return s;
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

  const canSubmit = Boolean(query);

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

      if (action === 'save') {
        toStage = currentOrderStage;
        toSubStage = currentSub;
        if (currentOrderStage === 'sample') {
          if (currentSub === 'dtf-pending') {
            stageData = { dtfVerified: true, note: stageForm.note };
          } else if (currentSub === 'stock') {
            stageData = { stockVerified: true, note: stageForm.note };
          } else if (currentSub === 'printing') {
            stageData = {
              printingStatus: stageForm.stageStatus,
              stageStatus: stageForm.stageStatus,
              tshirtsOnHoldCount: stageForm.stageStatus === 'On Hold' ? Number(stageForm.tshirtsOnHoldCount) || 0 : 0,
              logosOnHoldCount: stageForm.stageStatus === 'On Hold' ? Number(stageForm.logosOnHoldCount) || 0 : 0,
              stockSampleReceived: stageForm.stockSampleReceived,
              stockSampleNotReceivedCount: Number(stageForm.stockSampleNotReceivedCount) || 0,
              prodSampleReceived: stageForm.prodSampleReceived,
              prodSampleNotReceivedCount: Number(stageForm.prodSampleNotReceivedCount) || 0,
              itemPrinted: stageForm.itemPrinted,
              printedCount: Number(stageForm.printedCount) || 1,
              receivedCount: Number(stageForm.printedCount) || Number(stageForm.receivedCount) || 1,
              readyToPickupCount: Number(stageForm.readyToPickupCount) || 1,
              note: stageForm.note,
            };
          } else if (currentSub === 'ready-to-pick-up') {
            const finalStagingPcs = Number(stageForm.stagingCount !== undefined ? stageForm.stagingCount : stageForm.readyToPickupCount) || 1;
            stageData = {
              printingSampleReceived: stageForm.printingSampleReceived,
              printingSampleNotReceivedCount: stageForm.printingSampleReceived === 'no' ? Number(stageForm.printingSampleNotReceivedCount) || 0 : 0,
              sampleRequirementMatch: stageForm.sampleRequirementMatch !== false && stageForm.sampleRequirementMatch !== 'no',
              readyToPickupCount: finalStagingPcs,
              verifiedPickupCount: finalStagingPcs,
              stagingCount: finalStagingPcs,
              pickupStatus: stageForm.stageStatus || 'Complete',
              note: stageForm.note,
            };
          } else if (currentSub === 'staging-ground' || currentSub === 'staging-room') {
            stageData = {
              readyToPickSampleReceived: stageForm.readyToPickSampleReceived,
              readyToPickSampleNotReceivedCount: stageForm.readyToPickSampleReceived === 'no' ? Number(stageForm.readyToPickSampleNotReceivedCount) || 0 : 0,
              rackNo: String(stageForm.rackNo || '').trim(),
              stagedRackNumber: String(stageForm.rackNo || '').trim(),
              stagingStatus: stageForm.stageStatus || 'Complete',
              orderRequirementMatch: true,
              note: stageForm.note,
            };
          } else if (currentSub === 'customer-approval-awaiting') {
            stageData = {
              customerApproved: stageForm.customerApproved,
              paymentStatus: stageForm.paymentStatus,
              amountReceived: Number(stageForm.amountReceived) || 0,
              balanceRemaining: Number(stageForm.balanceRemaining) || 0,
              stageStatus: stageForm.stageStatus || (stageForm.customerApproved === 'yes' ? 'Complete' : 'Work in Progress'),
              note: stageForm.note,
            };
          }
        } else if (currentOrderStage === 'partial') {
          if (currentSub === 'dtf-pending') {
            stageData = { dtfVerified: true, note: stageForm.note };
          } else if (currentSub === 'stock') {
            stageData = { stockVerified: true, note: stageForm.note };
          } else if (currentSub === 'printing') {
            stageData = {
              printingStatus: stageForm.partialPrintingStatus,
              printedCount: Number(stageForm.partialPrintedCount) || 80,
              note: stageForm.note,
            };
          } else if (currentSub === 'quality-check') {
            stageData = {
              passedCount: Number(stageForm.partialQcPassedCount) || 80,
              rejectedCount: Number(stageForm.partialQcRejectedCount) || 0,
              qcPassed: true,
              note: stageForm.note,
            };
          } else if (currentSub === 'packaging') {
            stageData = {
              packedCount: Number(stageForm.partialPackedCount) || 80,
              cartonCount: Number(stageForm.partialCartonCount) || 2,
              packagingComplete: true,
              note: stageForm.note,
            };
          } else if (currentSub === 'staging-room') {
            stageData = {
              stagedRackNumber: stageForm.partialStagingRack || 'Rack P-04',
              dispatchReady: true,
              note: stageForm.note,
            };
          } else if (currentSub === 'payment-confirmation') {
            stageData = {
              invoiceNumber: stageForm.partialInvoiceNo || 'INV-PART-01',
              paymentMode: stageForm.partialPaymentMode || 'Bank Transfer',
              amountReceived: Number(stageForm.partialAmountReceived) || 50000,
              balancePending: Number(stageForm.partialBalanceRemaining) || 0,
              paymentVerified: true,
              note: stageForm.note,
            };
          }
        } else if (currentOrderStage === 'complete') {
          if (currentSub === 'dtf-pending') {
            stageData = { dtfVerified: true, note: stageForm.note };
          } else if (currentSub === 'stock') {
            stageData = { stockVerified: true, note: stageForm.note };
          } else if (currentSub === 'printing') {
            stageData = {
              printingStatus: stageForm.completePrintingStatus,
              printedCount: Number(stageForm.completePrintedCount) || lead.totalQuantity || 100,
              note: stageForm.note,
            };
          } else if (currentSub === 'quality-check') {
            stageData = {
              passedCount: Number(stageForm.completeQcPassedCount) || lead.totalQuantity || 100,
              rejectedCount: Number(stageForm.completeQcRejectedCount) || 0,
              qcPassed: true,
              note: stageForm.note,
            };
          } else if (currentSub === 'packaging') {
            stageData = {
              masterCartonsCount: Number(stageForm.completeMasterCartonsCount) || 4,
              totalUnitsPacked: Number(stageForm.completeUnitsPacked) || lead.totalQuantity || 100,
              packagingComplete: true,
              note: stageForm.note,
            };
          } else if (currentSub === 'delivery-pending') {
            stageData = {
              courierName: stageForm.completeCourierName || 'Blue Dart Express',
              trackingNumber: stageForm.completeTrackingNumber || 'AWB-BD-882319',
              dispatchDate: stageForm.completeDispatchDate || new Date().toISOString().split('T')[0],
              driverPhone: stageForm.completeDriverPhone || '+91 98765 43210',
              dispatchComplete: true,
              note: stageForm.note,
            };
          } else if (currentSub === 'delivered') {
            stageData = {
              deliveredDate: stageForm.completeDeliveryDate || new Date().toISOString().split('T')[0],
              receivedBy: stageForm.completeReceivedBy || lead.clientName || 'Store Manager',
              recipientContact: stageForm.completeRecipientPhone || lead.phoneNumber || '+91 98110 00000',
              podNumber: stageForm.completePodNumber || 'POD-99214',
              deliveryVerified: true,
              note: stageForm.note,
            };
          } else if (currentSub === 'customer-support') {
            stageData = {
              clientRating: Number(stageForm.completeClientRating) || 5,
              supportResolutionStatus: stageForm.completeSupportResolution || 'Delivered & Client Fully Satisfied',
              feedbackNotes: stageForm.completeClientFeedback || '',
              note: stageForm.note,
            };
          }
        }
      } else if (currentOrderStage === 'sample') {
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
            if (stageForm.stockSampleReceived === 'no' || stageForm.prodSampleReceived === 'no') {
              alert('Cannot submit order: sample/logo was not received from stock room or production team. Order is On Hold.');
              setSubmittingStageAction(false);
              return;
            }
            if (stageForm.stockSampleReceived !== 'yes' || stageForm.prodSampleReceived !== 'yes') {
              alert('Please select whether samples were received from stock room and production team.');
              setSubmittingStageAction(false);
              return;
            }
            if (stageForm.stageStatus !== 'Complete') {
              alert('Stage status must be Complete to advance to Ready to Pick Up.');
              setSubmittingStageAction(false);
              return;
            }
            toSubStage = 'ready-to-pick-up';
            stageData = {
              printingStatus: stageForm.stageStatus,
              stageStatus: stageForm.stageStatus,
              tshirtsOnHoldCount: stageForm.stageStatus === 'On Hold' ? Number(stageForm.tshirtsOnHoldCount) || 0 : 0,
              logosOnHoldCount: stageForm.stageStatus === 'On Hold' ? Number(stageForm.logosOnHoldCount) || 0 : 0,
              stockSampleReceived: stageForm.stockSampleReceived,
              stockSampleNotReceivedCount: stageForm.stockSampleReceived === 'no' ? Number(stageForm.stockSampleNotReceivedCount) || 0 : 0,
              prodSampleReceived: stageForm.prodSampleReceived,
              prodSampleNotReceivedCount: stageForm.prodSampleReceived === 'no' ? Number(stageForm.prodSampleNotReceivedCount) || 0 : 0,
              itemPrinted: stageForm.itemPrinted,
              printedCount: Number(stageForm.printedCount) || 1,
              receivedCount: Number(stageForm.printedCount) || Number(stageForm.receivedCount) || 1,
              readyToPickupCount: Number(stageForm.readyToPickupCount) || 1,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'order';
          }
        } else if (currentSub === 'ready-to-pick-up') {
          if (action === 'submit') {
            if (stageForm.printingSampleReceived === 'no') {
              alert('Cannot submit order: sample was not received from printing. Order is On Hold.');
              setSubmittingStageAction(false);
              return;
            }
            if (stageForm.printingSampleReceived !== 'yes') {
              alert('Please select whether sample was received from printing.');
              setSubmittingStageAction(false);
              return;
            }
            toSubStage = 'staging-room';
            const finalStagingPcs = Number(stageForm.stagingCount !== undefined ? stageForm.stagingCount : stageForm.readyToPickupCount) || 1;
            stageData = {
              printingSampleReceived: stageForm.printingSampleReceived,
              printingSampleNotReceivedCount: stageForm.printingSampleReceived === 'no' ? Number(stageForm.printingSampleNotReceivedCount) || 0 : 0,
              sampleRequirementMatch: stageForm.sampleRequirementMatch !== false && stageForm.sampleRequirementMatch !== 'no',
              readyToPickupCount: finalStagingPcs,
              verifiedPickupCount: finalStagingPcs,
              stagingCount: finalStagingPcs,
              pickupStatus: stageForm.stageStatus || 'Complete',
              note: stageForm.note,
            };
          } else {
            toSubStage = 'printing';
          }
        } else if (currentSub === 'staging-ground' || currentSub === 'staging-room') {
          if (action === 'submit') {
            if (stageForm.readyToPickSampleReceived === 'no') {
              alert('Cannot submit order: items were not received from ready to pick stage. Order is On Hold.');
              setSubmittingStageAction(false);
              return;
            }
            if (stageForm.readyToPickSampleReceived !== 'yes') {
              alert('Please select whether items were received from ready to pick stage.');
              setSubmittingStageAction(false);
              return;
            }
            if (!stageForm.rackNo || !String(stageForm.rackNo).trim()) {
              alert('Please enter the rack number where the sample is staged.');
              setSubmittingStageAction(false);
              return;
            }
            toSubStage = 'customer-approval-awaiting';
            stageData = {
              readyToPickSampleReceived: stageForm.readyToPickSampleReceived,
              readyToPickSampleNotReceivedCount: 0,
              rackNo: String(stageForm.rackNo).trim(),
              stagedRackNumber: String(stageForm.rackNo).trim(),
              stagingStatus: stageForm.stageStatus || 'Complete',
              orderRequirementMatch: true,
              note: stageForm.note,
            };
          } else {
            toSubStage = 'ready-to-pick-up';
          }
        } else if (currentSub === 'customer-approval-awaiting') {
          if (action === 'submit') {
            if (stageForm.customerApproved === 'no') {
              // Customer not approved -> go back to sample -> order
              toStage = 'sample';
              toSubStage = 'order';
              stageData = {
                customerApproved: 'no',
                stageStatus: 'Revisions Needed',
                note: stageForm.note,
              };
            } else if (stageForm.customerApproved === 'yes') {
              if (!stageForm.paymentStatus) {
                alert('Please select payment status.');
                setSubmittingStageAction(false);
                return;
              }
              toStage = 'partial';
              toSubStage = 'order';
              stageData = {
                customerApproved: 'yes',
                paymentStatus: stageForm.paymentStatus,
                amountReceived: Number(stageForm.amountReceived) || 0,
                balanceRemaining: Number(stageForm.balanceRemaining) || 0,
                stageStatus: 'Complete',
                note: stageForm.note,
              };
            } else {
              alert('Please select whether customer approved sample.');
              setSubmittingStageAction(false);
              return;
            }
          } else {
            // Refer back action -> go back to sample -> order
            toStage = 'sample';
            toSubStage = 'order';
            stageData = {
              customerApproved: 'no',
              note: stageForm.note,
            };
          }
        }
      } else if (currentOrderStage === 'partial') {
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
        if (action === 'save') {
          if (res.data?.data) {
            setOrderApprovalData(res.data.data);
          }
          alert(`Stage details for Order #${lead.orderId || 'Order'} saved successfully!`);
          return;
        }
        let msg = `Order #${lead.orderId || 'Order'} `;
        if (action === 'refer_back') {
          msg += `referred back to ${toSubStage.replace(/-/g, ' ')}.`;
        } else if (currentSub === 'customer-approval-awaiting' && currentOrderStage === 'sample') {
          if (stageForm.customerApproved === 'no' || action === 'refer_back') {
            msg += `sample not approved. Order returned to Sample -> Order.`;
          } else {
            msg += `sample approved! Order advanced to Partial Stage (Stock & Production tasks assigned).`;
          }
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

  const handleStockSampleReceivedChange = (val) => {
    const prodVal = stageForm.prodSampleReceived;
    let nextStatus = stageForm.stageStatus;
    if (val === 'no' || prodVal === 'no') {
      nextStatus = 'On Hold';
    } else if (val === 'yes' && prodVal === 'yes') {
      nextStatus = 'Complete';
    } else if (val === 'yes' && !prodVal) {
      nextStatus = 'Work in Progress';
    } else if (!val) {
      nextStatus = prodVal === 'no' ? 'On Hold' : 'Work in Progress';
    }
    setStageForm((prev) => ({
      ...prev,
      stockSampleReceived: val,
      stageStatus: nextStatus,
    }));
  };

  const handleProdSampleReceivedChange = (val) => {
    const stockVal = stageForm.stockSampleReceived;
    let nextStatus = stageForm.stageStatus;
    if (val === 'no' || stockVal === 'no') {
      nextStatus = 'On Hold';
    } else if (val === 'yes' && stockVal === 'yes') {
      nextStatus = 'Complete';
    } else if (val === 'yes' && !stockVal) {
      nextStatus = 'Work in Progress';
    } else if (!val) {
      nextStatus = stockVal === 'no' ? 'On Hold' : 'Work in Progress';
    }
    setStageForm((prev) => ({
      ...prev,
      prodSampleReceived: val,
      stageStatus: nextStatus,
    }));
  };

  const handlePrintingSampleReceivedChange = (val) => {
    let nextStatus = stageForm.stageStatus;
    if (val === 'no') {
      nextStatus = 'On Hold';
    } else if (val === 'yes') {
      nextStatus = 'Complete';
    } else {
      nextStatus = 'Work in Progress';
    }
    setStageForm((prev) => ({
      ...prev,
      printingSampleReceived: val,
      stageStatus: nextStatus,
      ...(val === 'yes' ? { printingSampleNotReceivedCount: '' } : {}),
    }));
  };

  const handleReadyToPickSampleReceivedChange = (val) => {
    let nextStatus = stageForm.stageStatus;
    if (val === 'no') {
      nextStatus = 'On Hold';
    } else if (val === 'yes') {
      nextStatus = 'Complete';
    } else {
      nextStatus = 'Work in Progress';
    }
    setStageForm((prev) => ({
      ...prev,
      readyToPickSampleReceived: val,
      stageStatus: nextStatus,
      ...(val === 'yes' ? { readyToPickSampleNotReceivedCount: '' } : {}),
    }));
  };

  const handleCustomerApprovedChange = (val) => {
    let nextStatus = 'Work in Progress';
    if (val === 'yes') {
      nextStatus = 'Complete';
    } else if (val === 'no') {
      nextStatus = 'On Hold';
    }
    setStageForm((prev) => ({
      ...prev,
      customerApproved: val,
      stageStatus: nextStatus,
    }));
  };

  const handleCustomerPaymentStatusChange = (val) => {
    const totalOrderAmount = Number(orderApprovalData?.netAmount || orderApprovalData?.totalAmount || 0);
    let nextReceived = stageForm.amountReceived;
    let nextBalance = stageForm.balanceRemaining;

    if (val === 'fully_received') {
      nextReceived = totalOrderAmount > 0 ? totalOrderAmount : (nextReceived || 0);
      nextBalance = 0;
    } else if (val === 'not_received') {
      nextReceived = 0;
      nextBalance = totalOrderAmount > 0 ? totalOrderAmount : (nextBalance || 0);
    } else if (val === 'partial_received') {
      if (nextReceived === '' || Number(nextReceived) === 0 || (totalOrderAmount > 0 && Number(nextReceived) === totalOrderAmount)) {
        nextReceived = totalOrderAmount > 0 ? Math.round(totalOrderAmount * 0.5) : '';
      }
      nextBalance = totalOrderAmount > 0 ? Math.max(0, totalOrderAmount - (Number(nextReceived) || 0)) : '';
    }

    setStageForm((prev) => ({
      ...prev,
      paymentStatus: val,
      amountReceived: nextReceived,
      balanceRemaining: nextBalance,
    }));
  };

  const handleCustomerAmountReceivedChange = (val) => {
    const totalOrderAmount = Number(orderApprovalData?.netAmount || orderApprovalData?.totalAmount || 0);
    const num = Number(val) || 0;
    const calcBal = totalOrderAmount > 0 ? Math.max(0, totalOrderAmount - num) : '';
    setStageForm((prev) => ({
      ...prev,
      amountReceived: val,
      balanceRemaining: calcBal !== '' ? calcBal : prev.balanceRemaining,
    }));
  };

  const renderStageWorkflowCard = () => {
    if (!orderApprovalData) return null;
    const fromUrl = searchParams.get('from') || '';
    let fromSub = '';
    if (fromUrl) {
      const match = fromUrl.match(/\/order\/(sample|partial|complete)\/(.+)/);
      if (match && match[2]) {
        fromSub = match[2].split('?')[0];
      }
    }
    const currentSub = (orderApprovalData.subStage || 'order').toLowerCase().replace(/\s+/g, '-');
    let activeSub = fromSub || currentSub;
    if (fromUrl.includes('/customer-approval-awaiting')) activeSub = 'customer-approval-awaiting';
    else if (fromUrl.includes('/staging-ground') || fromUrl.includes('/staging-room')) activeSub = 'staging-room';
    else if (fromUrl.includes('/ready-to-pick-up')) activeSub = 'ready-to-pick-up';
    else if (fromUrl.includes('/quality-check')) activeSub = 'quality-check';
    else if (fromUrl.includes('/packaging')) activeSub = 'packaging';
    else if (fromUrl.includes('/staging-room')) activeSub = 'staging-room';
    else if (fromUrl.includes('/payment-confirmation')) activeSub = 'payment-confirmation';
    else if (fromUrl.includes('/delivery-pending')) activeSub = 'delivery-pending';
    else if (fromUrl.includes('/delivered')) activeSub = 'delivered';
    else if (fromUrl.includes('/customer-support')) activeSub = 'customer-support';
    else if (fromUrl.includes('/printing')) activeSub = 'printing';
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
    const isPartialDtfPending = currentOrderStage === 'partial' && activeSub === 'dtf-pending';
    const isPartialStock = currentOrderStage === 'partial' && activeSub === 'stock';
    const isPartialPrinting = currentOrderStage === 'partial' && activeSub === 'printing';
    const isPartialQualityCheck = currentOrderStage === 'partial' && activeSub === 'quality-check';
    const isPartialPackaging = currentOrderStage === 'partial' && activeSub === 'packaging';
    const isPartialStagingRoom = currentOrderStage === 'partial' && activeSub === 'staging-room';
    const isPartialPaymentConfirmation = currentOrderStage === 'partial' && activeSub === 'payment-confirmation';

    // Complete sub-stages
    const isCompleteDtfPending = currentOrderStage === 'complete' && activeSub === 'dtf-pending';
    const isCompleteStock = currentOrderStage === 'complete' && activeSub === 'stock';
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
      isSampleDtfPending || isSampleStock || isSamplePrinting || isSampleReadyToPickup || isSampleStagingGround || isSampleCustomerApproval ||
      isPartialDtfPending || isPartialStock || isPartialPrinting || isPartialQualityCheck || isPartialPackaging || isPartialStagingRoom || isPartialPaymentConfirmation ||
      isCompleteDtfPending || isCompleteStock || isCompletePrinting || isCompleteQualityCheck || isCompletePackaging || isCompleteDeliveryPending || isCompleteDelivered || isCompleteCustomerSupport ||
      isAwaitingTaskClearance
    );

    if (!isRecognizedWorkflowStage) {
      return null;
    }

    const isCurrentStageApproved = Boolean(
      // Sample
      (activeSub === 'dtf-pending' && currentOrderStage === 'sample' && (['stock', 'printing', 'ready-to-pick-up', 'staging-ground', 'customer-approval-awaiting'].includes(currentSub) || currentOrderStage !== 'sample')) ||
      (activeSub === 'stock' && currentOrderStage === 'sample' && (['printing', 'ready-to-pick-up', 'staging-ground', 'customer-approval-awaiting'].includes(currentSub) || currentOrderStage !== 'sample')) ||
      (activeSub === 'printing' && currentOrderStage === 'sample' && (orderApprovalData.printingStageData?.printingStatus === 'Complete' || ['ready-to-pick-up', 'staging-ground', 'customer-approval-awaiting'].includes(currentSub) || currentOrderStage !== 'sample')) ||
      (activeSub === 'ready-to-pick-up' && (orderApprovalData.sampleReadyToPickUpData?.note || orderApprovalData.sampleReadyToPickUpData?.readyToPickupCount || ['staging-ground', 'customer-approval-awaiting'].includes(currentSub) || currentOrderStage !== 'sample')) ||
      (activeSub === 'staging-ground' && (orderApprovalData.sampleStagingGroundData?.orderRequirementMatch || currentSub === 'customer-approval-awaiting' || currentOrderStage !== 'sample')) ||
      (activeSub === 'customer-approval-awaiting' && (orderApprovalData.customerApprovalData?.customerApproved !== undefined || currentOrderStage !== 'sample')) ||
      // Partial
      (activeSub === 'dtf-pending' && currentOrderStage === 'partial' && (['stock', 'printing', 'quality-check', 'packaging', 'staging-room', 'payment-confirmation'].includes(currentSub) || currentOrderStage === 'complete')) ||
      (activeSub === 'stock' && currentOrderStage === 'partial' && (['printing', 'quality-check', 'packaging', 'staging-room', 'payment-confirmation'].includes(currentSub) || currentOrderStage === 'complete')) ||
      (activeSub === 'printing' && currentOrderStage === 'partial' && (orderApprovalData.partialPrintingData?.printingStatus === 'Complete' || ['quality-check', 'packaging', 'staging-room', 'payment-confirmation'].includes(currentSub) || currentOrderStage === 'complete')) ||
      (activeSub === 'quality-check' && currentOrderStage === 'partial' && (Boolean(orderApprovalData.partialQualityCheckData?.passedCount) || ['packaging', 'staging-room', 'payment-confirmation'].includes(currentSub) || currentOrderStage === 'complete')) ||
      (activeSub === 'packaging' && currentOrderStage === 'partial' && (Boolean(orderApprovalData.partialPackagingData?.packedCount) || ['staging-room', 'payment-confirmation'].includes(currentSub) || currentOrderStage === 'complete')) ||
      (activeSub === 'staging-room' && currentOrderStage === 'partial' && (Boolean(orderApprovalData.partialStagingRoomData?.dispatchReady) || currentSub === 'payment-confirmation' || currentOrderStage === 'complete')) ||
      (activeSub === 'payment-confirmation' && currentOrderStage === 'partial' && (Boolean(orderApprovalData.partialPaymentConfirmationData?.paymentVerified) || currentOrderStage === 'complete')) ||
      // Complete
      (activeSub === 'dtf-pending' && currentOrderStage === 'complete' && ['stock', 'printing', 'quality-check', 'packaging', 'delivery-pending', 'delivered', 'customer-support'].includes(currentSub)) ||
      (activeSub === 'stock' && currentOrderStage === 'complete' && ['printing', 'quality-check', 'packaging', 'delivery-pending', 'delivered', 'customer-support'].includes(currentSub)) ||
      (activeSub === 'printing' && currentOrderStage === 'complete' && (orderApprovalData.completePrintingData?.printingStatus === 'Complete' || ['quality-check', 'packaging', 'delivery-pending', 'delivered', 'customer-support'].includes(currentSub))) ||
      (activeSub === 'quality-check' && currentOrderStage === 'complete' && (Boolean(orderApprovalData.completeQualityCheckData?.passedCount) || ['packaging', 'delivery-pending', 'delivered', 'customer-support'].includes(currentSub))) ||
      (activeSub === 'packaging' && currentOrderStage === 'complete' && (Boolean(orderApprovalData.completePackagingData?.totalUnitsPacked) || ['delivery-pending', 'delivered', 'customer-support'].includes(currentSub))) ||
      (activeSub === 'delivery-pending' && currentOrderStage === 'complete' && (Boolean(orderApprovalData.completeDeliveryPendingData?.trackingNumber) || ['delivered', 'customer-support'].includes(currentSub))) ||
      (activeSub === 'delivered' && currentOrderStage === 'complete' && (Boolean(orderApprovalData.completeDeliveredData?.deliveredDate) || currentSub === 'customer-support')) ||
      (activeSub === 'customer-support' && currentOrderStage === 'complete' && (Boolean(orderApprovalData.completeCustomerSupportData?.clientRating || orderApprovalData.isCompleted || orderApprovalData.approvalStatus === 'Completed')))
    );

    let stageTitle = 'Stage Workflow';
    if (activeSub === 'dtf-pending') stageTitle = 'DTF Pending';
    else if (activeSub === 'stock') stageTitle = 'Stock';
    else if (activeSub === 'printing') stageTitle = 'Printing';
    else if (activeSub === 'ready-to-pick-up') stageTitle = 'Ready to Pick Up';
    else if (activeSub === 'staging-ground') stageTitle = 'Staging Room';
    else if (activeSub === 'customer-approval-awaiting') stageTitle = 'Customer Approval';
    else if (activeSub === 'quality-check') stageTitle = 'Quality Check';
    else if (activeSub === 'packaging') stageTitle = 'Packaging';
    else if (activeSub === 'staging-room') stageTitle = 'Staging Room';
    else if (activeSub === 'payment-confirmation') stageTitle = 'Payment Confirmation';
    else if (activeSub === 'delivery-pending') stageTitle = 'Delivery Pending';
    else if (activeSub === 'delivered') stageTitle = 'Delivered';
    else if (activeSub === 'customer-support') stageTitle = 'Customer Support';

    const itemsList = Array.isArray(orderApprovalData.items) ? orderApprovalData.items : [];
    const uniqueItemNames = Array.from(
      new Set(
        itemsList
          .map((it) => (it.item || it.itemDescription || it.description || it.name || '').trim())
          .filter(Boolean)
      )
    );
    const displayItemName = uniqueItemNames.length > 0 ? uniqueItemNames.join(', ') : 'Item';

    const stockSampleCount = (orderApprovalData.stockTaskData?.sampleDeduction !== undefined && Number(orderApprovalData.stockTaskData.sampleDeduction) > 0)
      ? Number(orderApprovalData.stockTaskData.sampleDeduction)
      : (orderApprovalData.sampleStagingGroundData?.givenForSample !== undefined && Number(orderApprovalData.sampleStagingGroundData.givenForSample) > 0)
      ? Number(orderApprovalData.sampleStagingGroundData.givenForSample)
      : (orderApprovalData.stockTaskData?.receivedCount !== undefined && Number(orderApprovalData.stockTaskData.receivedCount) > 0)
      ? Number(orderApprovalData.stockTaskData.receivedCount)
      : (orderApprovalData.sampleReadyToPickUpData?.readyToPickupCount !== undefined && Number(orderApprovalData.sampleReadyToPickUpData.readyToPickupCount) > 0)
      ? Number(orderApprovalData.sampleReadyToPickUpData.readyToPickupCount)
      : (Array.isArray(orderApprovalData.itemsStockData) && orderApprovalData.itemsStockData.some((it) => Number(it.sampleDeduction) > 0))
      ? orderApprovalData.itemsStockData.reduce((acc, it) => acc + (Number(it.sampleDeduction) || 0), 0)
      : 1;

    const prodSampleCount = (orderApprovalData.productionTaskData?.sampleLogosCount !== undefined && Number(orderApprovalData.productionTaskData.sampleLogosCount) > 0)
      ? Number(orderApprovalData.productionTaskData.sampleLogosCount)
      : (orderApprovalData.productionTaskData?.logosForSample !== undefined && Number(orderApprovalData.productionTaskData.logosForSample) > 0)
      ? Number(orderApprovalData.productionTaskData.logosForSample)
      : (orderApprovalData.productionTaskData?.givingForSample !== undefined && Number(orderApprovalData.productionTaskData.givingForSample) > 0)
      ? Number(orderApprovalData.productionTaskData.givingForSample)
      : (orderApprovalData.productionTaskData?.logosCutGiven !== undefined && Number(orderApprovalData.productionTaskData.logosCutGiven) > 0)
      ? Number(orderApprovalData.productionTaskData.logosCutGiven)
      : 1;

    const stockSampleLabel = `Stock Sample Received? (${stockSampleCount} pcs)`;
    const prodSampleLabel = `Production Logo Received? (${prodSampleCount} pcs)`;

    const printingSampleCount = orderApprovalData.printingStageData?.readyToPickupCount !== undefined
      ? Number(orderApprovalData.printingStageData.readyToPickupCount)
      : (orderApprovalData.printingStageData?.printedCount !== undefined
          ? Number(orderApprovalData.printingStageData.printedCount)
          : (orderApprovalData.printingStageData?.receivedCount !== undefined
              ? Number(orderApprovalData.printingStageData.receivedCount)
              : stockSampleCount || 1));

    const readyToPickSampleCount = orderApprovalData.sampleReadyToPickUpData?.stagingCount !== undefined
      ? Number(orderApprovalData.sampleReadyToPickUpData.stagingCount)
      : (orderApprovalData.sampleReadyToPickUpData?.readyToPickupCount !== undefined
          ? Number(orderApprovalData.sampleReadyToPickUpData.readyToPickupCount)
          : (orderApprovalData.sampleReadyToPickUpData?.verifiedPickupCount !== undefined
              ? Number(orderApprovalData.sampleReadyToPickUpData.verifiedPickupCount)
              : printingSampleCount || 1));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* SINGLE UNIFIED FORM CARD */}
        <div
          className="form-card"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '0px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {/* Stage Header: Clean Icon + Title, NO description */}
          <div
            className="form-card-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingBottom: '14px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package size={18} color="#1e293b" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                {stageTitle}
              </h3>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              Stage Status: <span style={{
                color: isCurrentStageApproved
                  ? '#059669'
                  : stageForm.stageStatus === 'Complete'
                  ? '#059669'
                  : stageForm.stageStatus === 'On Hold'
                  ? '#dc2626'
                  : '#d97706',
                fontWeight: 700
              }}>
                {isCurrentStageApproved ? 'Approved & Advanced' : (stageForm.stageStatus || 'In Progress')}
              </span>
            </div>
          </div>

          {/* 1. ORDER & LEAD DETAILS (4-column grid) */}
          <div className="form-grid-4" style={{ marginBottom: '20px' }}>
            <div className="form-field">
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Order ID</label>
              <input
                type="text"
                readOnly
                value={orderApprovalData.orderId || (orderApprovalData._id ? `ORD-${String(orderApprovalData._id).slice(-5).toUpperCase()}` : 'ORD-00000')}
                className="read-only-input bold"
                style={{ fontSize: '14px', background: 'rgba(0,0,0,0.02)', color: '#0f172a' }}
              />
            </div>
            <div className="form-field">
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Employee Name</label>
              <input
                type="text"
                readOnly
                value={orderApprovalData.employeeName || 'Sales Executive'}
                className="read-only-input bold"
                style={{ fontSize: '14px', background: 'rgba(0,0,0,0.02)', color: '#0f172a' }}
              />
            </div>
            <div className="form-field">
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Company Name</label>
              <input
                type="text"
                readOnly
                value={orderApprovalData.companyName || orderApprovalData.clientName || '-'}
                className="read-only-input bold"
                style={{ fontSize: '14px', background: 'rgba(0,0,0,0.02)', color: '#0f172a' }}
              />
            </div>
            <div className="form-field">
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Date</label>
              <input
                type="text"
                readOnly
                value={orderApprovalData.createdAt ? new Date(orderApprovalData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                className="read-only-input bold"
                style={{ fontSize: '14px', background: 'rgba(0,0,0,0.02)', color: '#0f172a' }}
              />
            </div>
          </div>

          {/* 2. ALL ITEMS ATTACHED IN LEAD TABLE */}
          {(() => {
            const hasSublimation = itemsList.some(
              (it) =>
                String(it.printingType || '').toLowerCase().trim() === 'sublimation' ||
                (it.sublimation && it.sublimation !== '-' && it.sublimation !== '') ||
                (it.sublimationOption && it.sublimationOption !== '-' && it.sublimationOption !== '')
            );

            return (
              <div className="table-responsive" style={{ marginBottom: '20px', overflowX: 'auto' }}>
                <table className="items-review-table stock-review-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ minWidth: '36px', textAlign: 'center', padding: '10px 8px', fontSize: '12.5px', fontWeight: 600 }}>S.N</th>
                      <th style={{ minWidth: '110px', padding: '10px 8px', fontSize: '12.5px', fontWeight: 600 }}>Item Description</th>
                      <th style={{ minWidth: '85px', padding: '10px 8px', fontSize: '12.5px', fontWeight: 600 }}>Printing Type</th>
                      {hasSublimation && (
                        <th style={{ minWidth: '75px', padding: '10px 8px', fontSize: '12.5px', fontWeight: 600 }}>Sublimation</th>
                      )}
                      <th style={{ minWidth: '75px', padding: '10px 8px', fontSize: '12.5px', fontWeight: 600 }}>Fabric</th>
                      <th style={{ minWidth: '75px', padding: '10px 8px', fontSize: '12.5px', fontWeight: 600 }}>Quantity</th>
                      <th style={{ minWidth: '50px', padding: '10px 8px', fontSize: '12.5px', fontWeight: 600 }}>Size</th>
                      <th style={{ minWidth: '65px', padding: '10px 8px', fontSize: '12.5px', fontWeight: 600 }}>Color</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsList.length === 0 ? (
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ textAlign: 'center', padding: '10px 8px', fontSize: '13.5px' }}>1</td>
                        <td style={{ padding: '10px 8px', fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>{orderApprovalData.item || 'Apparel Item'}</td>
                        <td style={{ padding: '10px 8px', fontSize: '13.5px', color: '#334155' }}>{formatPrintingType(orderApprovalData.printingType)}</td>
                        {hasSublimation && (
                          <td style={{ padding: '10px 8px', fontSize: '13.5px', color: '#334155' }}>-</td>
                        )}
                        <td style={{ padding: '10px 8px', fontSize: '13.5px', color: '#334155' }}>{orderApprovalData.fabric || '-'}</td>
                        <td style={{ padding: '10px 8px', fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>{orderApprovalData.totalQuantity || 0} pcs</td>
                        <td style={{ padding: '10px 8px', fontSize: '13.5px', color: '#334155' }}>-</td>
                        <td style={{ padding: '10px 8px', fontSize: '13.5px', color: '#334155' }}>-</td>
                      </tr>
                    ) : (
                      itemsList.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ textAlign: 'center', padding: '10px 8px', fontSize: '13.5px', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 8px', fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>{item.item || 'Apparel Item'}</td>
                          <td style={{ padding: '10px 8px', fontSize: '13.5px', color: '#334155' }}>{formatPrintingType(item.printingType)}</td>
                          {hasSublimation && (
                            <td style={{ padding: '10px 8px', fontSize: '13.5px', color: '#334155' }}>{item.sublimation || item.sublimationOption || '-'}</td>
                          )}
                          <td style={{ padding: '10px 8px', fontSize: '13.5px', color: '#334155' }}>{item.fabric || '-'}</td>
                          <td style={{ padding: '10px 8px', fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>{item.quantity ? `${item.quantity} pcs` : '-'}</td>
                          <td style={{ padding: '10px 8px', fontSize: '13.5px', color: '#334155' }}>{item.size || '-'}</td>
                          <td style={{ padding: '10px 8px', fontSize: '13.5px', color: '#334155' }}>{item.color || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* 3. STAGE EXECUTION & VERIFICATION CONTROLS (Clean neutral styling, NO color grading) */}

          {/* DTF PENDING (Sample, Partial, Complete) */}
          {(isSampleDtfPending || isPartialDtfPending || isCompleteDtfPending) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                  DTF Film Preparation &amp; Verification
                </div>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  Ensure DTF film printing, artwork sizing, and colors are verified before apparel heat press.
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                    style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }}
                  />
                  <span>DTF films prepared, printed, and ready for apparel application</span>
                </label>
              </div>
            </div>
          )}

          {/* STOCK (Sample, Partial, Complete) */}
          {(isSampleStock || isPartialStock || isCompleteStock) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                  Stock Allocation &amp; Inventory Verification
                </div>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  Verify physical inventory availability for all attached items in lead.
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                    style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }}
                  />
                  <span>Stock verified and allocated for printing stage</span>
                </label>
              </div>
            </div>
          )}

          {/* SAMPLE -> PRINTING */}
          {isSamplePrinting && (
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Printer size={17} />
                  Printing
                </h4>
                <button
                  type="button"
                  id="btn-save-printing-form"
                  onClick={() => handleExecuteStageTransition('save')}
                  disabled={submittingStageAction}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    padding: '7px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: submittingStageAction ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <Save size={14} />
                  <span>{submittingStageAction ? 'Saving...' : 'Save'}</span>
                </button>
              </div>

              {/* Printing Status Dropdown & On Hold Fields */}
              <div style={{ marginBottom: '18px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: stageForm.stageStatus === 'On Hold' ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr', gap: '14px' }}>
                  <div className="form-field">
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Status:
                    </label>
                    <select
                      id="select-printing-stage-status"
                      value={stageForm.stageStatus || 'Work in Progress'}
                      onChange={(e) => setStageForm({ ...stageForm, stageStatus: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: stageForm.stageStatus === 'On Hold' ? '#dc2626' : stageForm.stageStatus === 'Complete' ? '#16a34a' : '#0f172a',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="Work in Progress">Work in Progress</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Complete">Complete</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  {stageForm.stageStatus === 'On Hold' && (
                    <>
                      <div className="form-field">
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#dc2626', marginBottom: '6px' }}>
                          T-Shirts on Hold (pcs):
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Enter T-shirts count..."
                          value={stageForm.tshirtsOnHoldCount}
                          onChange={(e) => setStageForm({ ...stageForm, tshirtsOnHoldCount: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: '1px solid #fca5a5',
                            background: '#ffffff',
                            fontSize: '13.5px',
                            color: '#0f172a',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div className="form-field">
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#dc2626', marginBottom: '6px' }}>
                          Logos on Hold (pcs):
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Enter logos count..."
                          value={stageForm.logosOnHoldCount}
                          onChange={(e) => setStageForm({ ...stageForm, logosOnHoldCount: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: '1px solid #fca5a5',
                            background: '#ffffff',
                            fontSize: '13.5px',
                            color: '#0f172a',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Questions 1 & 2: Stock Room & Production Team Samples */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                {/* Q1: Stock Room */}
                <div className="form-field">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    {stockSampleLabel}
                  </label>
                  <select
                    id="select-stock-sample-received"
                    value={stageForm.stockSampleReceived || ''}
                    onChange={(e) => handleStockSampleReceivedChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      color: '#0f172a',
                      cursor: 'pointer',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  {stageForm.stockSampleReceived === 'no' && (
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Deficit (pcs)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter deficit..."
                        value={stageForm.stockSampleNotReceivedCount}
                        onChange={(e) => setStageForm({ ...stageForm, stockSampleNotReceivedCount: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '13.5px',
                          color: '#0f172a',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Q2: Production Team */}
                <div className="form-field">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    {prodSampleLabel}
                  </label>
                  <select
                    id="select-prod-sample-received"
                    value={stageForm.prodSampleReceived || ''}
                    onChange={(e) => handleProdSampleReceivedChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      color: '#0f172a',
                      cursor: 'pointer',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  {stageForm.prodSampleReceived === 'no' && (
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Deficit (pcs)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter deficit..."
                        value={stageForm.prodSampleNotReceivedCount}
                        onChange={(e) => setStageForm({ ...stageForm, prodSampleNotReceivedCount: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '13.5px',
                          color: '#0f172a',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Questions 3, 4, 5: Item Printed?, Printed (pcs), Ready to Pick Up (pcs) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {/* Q3: Item Printed? */}
                <div className="form-field">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    {displayItemName} Printed?
                  </label>
                  <select
                    id="select-item-printed"
                    value={stageForm.itemPrinted || 'yes'}
                    onChange={(e) => setStageForm({ ...stageForm, itemPrinted: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      color: '#0f172a',
                      cursor: 'pointer',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {/* Q4: Printed (pcs) */}
                <div className="form-field">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Printed (pcs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stageForm.printedCount !== undefined ? stageForm.printedCount : stageForm.receivedCount}
                    onChange={(e) => setStageForm({ ...stageForm, printedCount: e.target.value, receivedCount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      background: '#ffffff',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Q5: Ready to Pick Up (pcs) */}
                <div className="form-field">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Ready to Pick Up (pcs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stageForm.readyToPickupCount}
                    onChange={(e) => setStageForm({ ...stageForm, readyToPickupCount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      background: '#ffffff',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SAMPLE -> READY TO PICK UP */}
          {isSampleReadyToPickup && (
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={17} />
                  Ready to Pick Up
                </h4>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                {/* Q1: Sample Received from Printing? */}
                <div className="form-field">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Sample Received from Printing? ({printingSampleCount} pcs)
                  </label>
                  <select
                    id="select-printing-sample-received"
                    value={stageForm.printingSampleReceived || ''}
                    onChange={(e) => handlePrintingSampleReceivedChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      color: '#0f172a',
                      cursor: 'pointer',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  {stageForm.printingSampleReceived === 'no' && (
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Deficit (pcs)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter deficit..."
                        value={stageForm.printingSampleNotReceivedCount}
                        onChange={(e) => setStageForm({ ...stageForm, printingSampleNotReceivedCount: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '13.5px',
                          color: '#0f172a',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Q2: How many final sample for staging room */}
                <div className="form-field">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Final Samples for Staging Room (pcs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stageForm.stagingCount !== undefined ? stageForm.stagingCount : stageForm.readyToPickupCount}
                    onChange={(e) => setStageForm({ ...stageForm, stagingCount: e.target.value, readyToPickupCount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      background: '#ffffff',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Q3: All garments/items match client order specifications? (Radio Yes/No) */}
              <div className="form-field" style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  All garments/items match client order specifications?
                </label>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                    <input
                      type="radio"
                      name="sampleRequirementMatch"
                      value="yes"
                      checked={stageForm.sampleRequirementMatch !== false && stageForm.sampleRequirementMatch !== 'no'}
                      onChange={() => setStageForm((prev) => ({ ...prev, sampleRequirementMatch: true }))}
                      style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <span>Yes</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                    <input
                      type="radio"
                      name="sampleRequirementMatch"
                      value="no"
                      checked={stageForm.sampleRequirementMatch === false || stageForm.sampleRequirementMatch === 'no'}
                      onChange={() => setStageForm((prev) => ({ ...prev, sampleRequirementMatch: false }))}
                      style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SAMPLE -> STAGING GROUND / STAGING ROOM */}
          {isSampleStagingGround && (
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={17} />
                  Staging Room
                </h4>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Q1: Items Received from Ready to Pick? */}
                <div className="form-field">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Items Received from Ready to Pick? ({readyToPickSampleCount} pcs)
                  </label>
                  <select
                    id="select-ready-to-pick-sample-received"
                    value={stageForm.readyToPickSampleReceived || ''}
                    onChange={(e) => handleReadyToPickSampleReceivedChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      color: '#0f172a',
                      cursor: 'pointer',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  {stageForm.readyToPickSampleReceived === 'no' && (
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Deficit (pcs)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter deficit..."
                        value={stageForm.readyToPickSampleNotReceivedCount}
                        onChange={(e) => setStageForm({ ...stageForm, readyToPickSampleNotReceivedCount: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '13.5px',
                          color: '#0f172a',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Q2: Sample on Which Rack No.? */}
                {stageForm.readyToPickSampleReceived === 'yes' && (
                  <div className="form-field">
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Sample on Which Rack No.?
                    </label>
                    <input
                      type="text"
                      id="input-sample-rack-no"
                      placeholder="Enter rack number (e.g. Rack A-12)"
                      value={stageForm.rackNo || ''}
                      onChange={(e) => setStageForm({ ...stageForm, rackNo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        background: '#ffffff',
                        color: '#0f172a',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SAMPLE -> CUSTOMER APPROVAL AWAITING */}
          {isSampleCustomerApproval && (
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={17} />
                  Customer Approval
                </h4>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Q1: Has customer approved sample? */}
                <div className="form-field">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Has Customer Approved Sample?
                  </label>
                  <select
                    id="select-customer-sample-approved"
                    value={stageForm.customerApproved || ''}
                    onChange={(e) => handleCustomerApprovedChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      color: '#0f172a',
                      cursor: 'pointer',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  {stageForm.customerApproved === 'no' && (
                    <div style={{ marginTop: '8px', fontSize: '12.5px', color: '#dc2626', fontWeight: 500 }}>
                      Sample not approved. Clicking &ldquo;Return to Order&rdquo; will send the order back to Sample &rarr; Order.
                    </div>
                  )}
                </div>

                {/* Q2: If Yes -> Payment Status */}
                {stageForm.customerApproved === 'yes' && (
                  <div className="form-field">
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Payment Status
                    </label>
                    <select
                      id="select-customer-payment-status"
                      value={stageForm.paymentStatus || ''}
                      onChange={(e) => handleCustomerPaymentStatusChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '13.5px',
                        fontWeight: 500,
                        color: '#0f172a',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Select Payment Status...</option>
                      <option value="fully_received">Fully Received</option>
                      <option value="partial_received">Partial Received</option>
                      <option value="not_received">Not Received</option>
                    </select>
                  </div>
                )}
              </div>

              {/* If Yes and paymentStatus selected: show amount received and balance */}
              {stageForm.customerApproved === 'yes' && stageForm.paymentStatus && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
                  <div className="form-field">
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Amount Received (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Enter amount received..."
                      value={stageForm.amountReceived}
                      onChange={(e) => handleCustomerAmountReceivedChange(e.target.value)}
                      readOnly={stageForm.paymentStatus === 'not_received'}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        background: stageForm.paymentStatus === 'not_received' ? '#f8fafc' : '#ffffff',
                        color: '#0f172a',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div className="form-field">
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Balance Remaining (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Balance remaining..."
                      value={stageForm.balanceRemaining}
                      onChange={(e) => setStageForm({ ...stageForm, balanceRemaining: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        background: '#ffffff',
                        color: '#0f172a',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PARTIAL -> PRINTING */}
          {isPartialPrinting && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '10px' }}>
                  Partial Printing Execution Metrics
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Pieces Printed in Partial Run
                    </label>
                    <input
                      type="number"
                      value={stageForm.partialPrintedCount}
                      onChange={(e) => setStageForm({ ...stageForm, partialPrintedCount: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Partial Run Status
                    </label>
                    <select
                      value={stageForm.partialPrintingStatus}
                      onChange={(e) => setStageForm({ ...stageForm, partialPrintingStatus: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    >
                      <option value="Complete">Complete (Ready for Quality Check)</option>
                      <option value="Work in Progress">Work in Progress</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PARTIAL -> QUALITY CHECK */}
          {isPartialQualityCheck && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} color="#059669" /> Verified Data from Partial Printing
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <div>Pieces Printed: <strong>{orderApprovalData.partialPrintingData?.printedCount || 80} pcs</strong></div>
                  <div>Printing Status: <strong style={{ color: '#059669' }}>{orderApprovalData.partialPrintingData?.printingStatus || 'Complete'}</strong></div>
                  <div>Customer Sample Sign-Off: <strong style={{ color: '#059669' }}>✓ Approved</strong></div>
                </div>
                {orderApprovalData.partialPrintingData?.note && (
                  <div style={{ fontSize: '12.5px', color: '#334155', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                    <strong>Printing Remarks:</strong> &ldquo;{orderApprovalData.partialPrintingData.note}&rdquo;
                  </div>
                )}
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '10px' }}>
                  Quality Check Inspection Standards
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input type="checkbox" checked={true} readOnly style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }} />
                    <span>Stitching, hemming, and seam strength verified</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input type="checkbox" checked={true} readOnly style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }} />
                    <span>Print curing and logo alignment verified against approved sample</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input type="checkbox" checked={true} readOnly style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }} />
                    <span>Color consistency and fabric integrity verified</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Passed Units (pcs)
                    </label>
                    <input
                      type="number"
                      value={stageForm.partialQcPassedCount}
                      onChange={(e) => setStageForm({ ...stageForm, partialQcPassedCount: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Rejected / Repair Units (pcs)
                    </label>
                    <input
                      type="number"
                      value={stageForm.partialQcRejectedCount}
                      onChange={(e) => setStageForm({ ...stageForm, partialQcRejectedCount: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PARTIAL -> PACKAGING */}
          {isPartialPackaging && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} color="#059669" /> Verified Data from Quality Check
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <div>QC Passed Units: <strong style={{ color: '#059669' }}>{orderApprovalData.partialQualityCheckData?.passedCount || 80} pcs</strong></div>
                  <div>QC Rejection Count: <strong>{orderApprovalData.partialQualityCheckData?.rejectedCount || 0} pcs</strong></div>
                  <div>Inspection Status: <strong style={{ color: '#059669' }}>✓ Quality Passed</strong></div>
                </div>
                {orderApprovalData.partialQualityCheckData?.note && (
                  <div style={{ fontSize: '12.5px', color: '#334155', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                    <strong>QC Remarks:</strong> &ldquo;{orderApprovalData.partialQualityCheckData.note}&rdquo;
                  </div>
                )}
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '10px' }}>
                  Packaging &amp; Labeling Execution
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input type="checkbox" checked={true} readOnly style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }} />
                    <span>Garments individually folded into sealed polybags with moisture silica</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input type="checkbox" checked={true} readOnly style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }} />
                    <span>Carton labels and size-breakdown barcodes affixed</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Total Units Packed (pcs)
                    </label>
                    <input
                      type="number"
                      value={stageForm.partialPackedCount}
                      onChange={(e) => setStageForm({ ...stageForm, partialPackedCount: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Cartons / Boxes Count
                    </label>
                    <input
                      type="number"
                      value={stageForm.partialCartonCount}
                      onChange={(e) => setStageForm({ ...stageForm, partialCartonCount: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PARTIAL -> STAGING ROOM */}
          {isPartialStagingRoom && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} color="#059669" /> Verified Data from Packaging
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <div>Packed Units: <strong>{orderApprovalData.partialPackagingData?.packedCount || 80} pcs</strong></div>
                  <div>Cartons Packed: <strong>{orderApprovalData.partialPackagingData?.cartonCount || 2} boxes</strong></div>
                  <div>QC Certification: <strong style={{ color: '#059669' }}>✓ Verified Passed</strong></div>
                </div>
                {orderApprovalData.partialPackagingData?.note && (
                  <div style={{ fontSize: '12.5px', color: '#334155', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                    <strong>Packaging Remarks:</strong> &ldquo;{orderApprovalData.partialPackagingData.note}&rdquo;
                  </div>
                )}
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '10px' }}>
                  Partial Staging Room Verification
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input type="checkbox" checked={true} readOnly style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }} />
                    <span>Cartons staged in designated Partial Dispatch Bay</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input type="checkbox" checked={true} readOnly style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }} />
                    <span>Physical carton count matches packaging delivery manifest</span>
                  </label>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Staging Rack / Bay Identifier
                  </label>
                  <input
                    type="text"
                    value={stageForm.partialStagingRack}
                    onChange={(e) => setStageForm({ ...stageForm, partialStagingRack: e.target.value })}
                    style={{ width: '100%', maxWidth: '320px', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PARTIAL -> PAYMENT CONFIRMATION */}
          {isPartialPaymentConfirmation && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} color="#059669" /> Cumulative Partial Production Verification
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <div>Staging Bay Location: <strong>{orderApprovalData.partialStagingRoomData?.stagedRackNumber || 'Rack P-04'}</strong></div>
                  <div>Cartons Staged: <strong>{orderApprovalData.partialPackagingData?.cartonCount || 2} boxes</strong></div>
                  <div>Total Net Order Value: <strong style={{ color: '#059669' }}>₹{Number(orderApprovalData.netAmount || 100000).toLocaleString()}</strong></div>
                  <div>Advance Received: <strong style={{ color: '#059669' }}>₹{Number(orderApprovalData.advanceAmount || 50000).toLocaleString()}</strong></div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '10px' }}>
                  Partial Billing &amp; Payment Clearance
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Invoice / Receipt Number
                    </label>
                    <input
                      type="text"
                      value={stageForm.partialInvoiceNo}
                      onChange={(e) => setStageForm({ ...stageForm, partialInvoiceNo: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Payment Mode
                    </label>
                    <select
                      value={stageForm.partialPaymentMode}
                      onChange={(e) => setStageForm({ ...stageForm, partialPaymentMode: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI / Digital Payment</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Partial Amount Verified (₹)
                    </label>
                    <input
                      type="number"
                      value={stageForm.partialAmountReceived}
                      onChange={(e) => setStageForm({ ...stageForm, partialAmountReceived: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '12px', padding: '10px 14px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#059669' }}>
                    ✓ On submitting payment confirmation, this order will advance to <strong>COMPLETE Stage</strong> and automatically create new tasks for both Stock Room Manager and Production Lead.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* COMPLETE -> PRINTING */}
          {isCompletePrinting && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '10px' }}>
                  Complete Bulk Printing Metrics
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Bulk Run Printed Quantity (pcs)
                    </label>
                    <input
                      type="number"
                      value={stageForm.completePrintedCount}
                      onChange={(e) => setStageForm({ ...stageForm, completePrintedCount: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Bulk Printing Status
                    </label>
                    <select
                      value={stageForm.completePrintingStatus}
                      onChange={(e) => setStageForm({ ...stageForm, completePrintingStatus: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    >
                      <option value="Complete">Complete (Ready for QC)</option>
                      <option value="Work in Progress">Work in Progress</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPLETE -> QUALITY CHECK */}
          {isCompleteQualityCheck && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} color="#059669" /> Verified Data from Complete Printing
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <div>Bulk Pieces Printed: <strong>{orderApprovalData.completePrintingData?.printedCount || orderApprovalData.totalQuantity || 100} pcs</strong></div>
                  <div>Printing Status: <strong style={{ color: '#059669' }}>{orderApprovalData.completePrintingData?.printingStatus || 'Complete'}</strong></div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '10px' }}>
                  Final Bulk QC Standards
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input type="checkbox" checked={true} readOnly style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }} />
                    <span>100% final batch quality audit completed</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input type="checkbox" checked={true} readOnly style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }} />
                    <span>Zero-defect sign-off issued for bulk shipment</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Passed Units (pcs)
                    </label>
                    <input
                      type="number"
                      value={stageForm.completeQcPassedCount}
                      onChange={(e) => setStageForm({ ...stageForm, completeQcPassedCount: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Rejection Units (pcs)
                    </label>
                    <input
                      type="number"
                      value={stageForm.completeQcRejectedCount}
                      onChange={(e) => setStageForm({ ...stageForm, completeQcRejectedCount: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPLETE -> PACKAGING */}
          {isCompletePackaging && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} color="#059669" /> Verified Data from Final QC
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <div>Final QC Passed: <strong style={{ color: '#059669' }}>{orderApprovalData.completeQualityCheckData?.passedCount || orderApprovalData.totalQuantity || 100} pcs</strong></div>
                  <div>Final Rejection: <strong>{orderApprovalData.completeQualityCheckData?.rejectedCount || 0} pcs</strong></div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '10px' }}>
                  Final Bulk Packaging Metrics
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Total Units Packed (pcs)
                    </label>
                    <input
                      type="number"
                      value={stageForm.completeUnitsPacked}
                      onChange={(e) => setStageForm({ ...stageForm, completeUnitsPacked: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Master Cartons Count (boxes)
                    </label>
                    <input
                      type="number"
                      value={stageForm.completeMasterCartonsCount}
                      onChange={(e) => setStageForm({ ...stageForm, completeMasterCartonsCount: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPLETE -> DELIVERY PENDING */}
          {isCompleteDeliveryPending && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} color="#059669" /> Customer Delivery Destination Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <div>Client: <strong>{orderApprovalData.clientName || 'Client'}</strong> ({orderApprovalData.companyName || '-'})</div>
                  <div>Phone: <strong>{orderApprovalData.phoneNumber || '-'}</strong></div>
                  <div>Address: <strong>{orderApprovalData.companyAddress || '-'}, {orderApprovalData.state || ''} {orderApprovalData.pincode || ''}</strong></div>
                  <div>Total Packed: <strong style={{ color: '#059669' }}>{orderApprovalData.completePackagingData?.totalUnitsPacked || orderApprovalData.totalQuantity || 100} pcs ({orderApprovalData.completePackagingData?.masterCartonsCount || 4} cartons)</strong></div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '10px' }}>
                  Logistics &amp; Dispatch Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Logistics / Courier Partner
                    </label>
                    <input
                      type="text"
                      value={stageForm.completeCourierName}
                      onChange={(e) => setStageForm({ ...stageForm, completeCourierName: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Tracking AWB Number
                    </label>
                    <input
                      type="text"
                      value={stageForm.completeTrackingNumber}
                      onChange={(e) => setStageForm({ ...stageForm, completeTrackingNumber: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Dispatch Date
                    </label>
                    <input
                      type="date"
                      value={stageForm.completeDispatchDate}
                      onChange={(e) => setStageForm({ ...stageForm, completeDispatchDate: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Driver / Courier Contact
                    </label>
                    <input
                      type="text"
                      value={stageForm.completeDriverPhone}
                      onChange={(e) => setStageForm({ ...stageForm, completeDriverPhone: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPLETE -> DELIVERED */}
          {isCompleteDelivered && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} color="#059669" /> Transit &amp; Dispatch Verification
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <div>Transporter: <strong>{orderApprovalData.completeDeliveryPendingData?.courierName || 'Blue Dart Express'}</strong></div>
                  <div>AWB Tracking: <strong>{orderApprovalData.completeDeliveryPendingData?.trackingNumber || 'AWB-BD-882319'}</strong></div>
                  <div>Dispatch Date: <strong>{orderApprovalData.completeDeliveryPendingData?.dispatchDate || 'Recent'}</strong></div>
                  <div>Client Phone: <strong>{orderApprovalData.phoneNumber || '-'}</strong></div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '10px' }}>
                  Proof of Delivery (POD) &amp; Recipient Acknowledgment
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Delivery Date / Timestamp
                    </label>
                    <input
                      type="date"
                      value={stageForm.completeDeliveryDate}
                      onChange={(e) => setStageForm({ ...stageForm, completeDeliveryDate: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Received By (Person Name)
                    </label>
                    <input
                      type="text"
                      value={stageForm.completeReceivedBy}
                      onChange={(e) => setStageForm({ ...stageForm, completeReceivedBy: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      POD / Delivery Receipt #
                    </label>
                    <input
                      type="text"
                      value={stageForm.completePodNumber}
                      onChange={(e) => setStageForm({ ...stageForm, completePodNumber: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPLETE -> CUSTOMER SUPPORT */}
          {isCompleteCustomerSupport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} color="#059669" /> End-to-End Production &amp; Delivery Verification
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <div>Sample Stage: <strong style={{ color: '#059669' }}>✓ Approved by Client</strong></div>
                  <div>Partial Stage: <strong style={{ color: '#059669' }}>✓ Paid &amp; Fulfilled</strong></div>
                  <div>Bulk Delivery: <strong style={{ color: '#059669' }}>✓ Delivered (POD: {orderApprovalData.completeDeliveredData?.podNumber || 'POD-99214'})</strong></div>
                  <div>Received By: <strong>{orderApprovalData.completeDeliveredData?.receivedBy || orderApprovalData.clientName || 'Store Manager'}</strong></div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '10px' }}>
                  Customer Satisfaction &amp; Order Final Sign-Off
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Customer Rating
                    </label>
                    <select
                      value={stageForm.completeClientRating}
                      onChange={(e) => setStageForm({ ...stageForm, completeClientRating: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    >
                      <option value="5">⭐⭐⭐⭐⭐ 5 Stars (Delighted)</option>
                      <option value="4">⭐⭐⭐⭐ 4 Stars (Satisfied)</option>
                      <option value="3">⭐⭐⭐ 3 Stars (Neutral)</option>
                      <option value="2">⭐⭐ 2 Stars (Needs Improvement)</option>
                      <option value="1">⭐ 1 Star (Unsatisfied)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Resolution &amp; Fulfillment Status
                    </label>
                    <select
                      value={stageForm.completeSupportResolution}
                      onChange={(e) => setStageForm({ ...stageForm, completeSupportResolution: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                    >
                      <option value="Delivered & Client Fully Satisfied">Delivered &amp; Client Fully Satisfied</option>
                      <option value="Follow-up Required">Follow-up Required</option>
                      <option value="Issue Resolved">Issue Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AWAITING TASK CLEARANCE */}
          {isAwaitingTaskClearance && (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '6px' }}>
                Department Clearance Tasks Pending
              </div>
              <div style={{ fontSize: '13px', color: '#475569' }}>
                Stock Room and Production Lead clearances are required before proceeding to the execution workflow.
              </div>
            </div>
          )}

          {/* 4. REMARKS */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Remarks:
            </label>
            <textarea
              rows={2}
              placeholder="Enter remarks..."
              value={stageForm.note}
              onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                color: '#1e293b',
                backgroundColor: '#ffffff',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Audit Trail / History */}
        {orderApprovalData.approvalComments && orderApprovalData.approvalComments.length > 0 && (
          <div className="comment-history-list" style={{ marginTop: '20px' }}>
            <h4 className="history-title">Activity &amp; Review History</h4>
            <div className="timeline-items">
              {orderApprovalData.approvalComments.map((item, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-avatar">
                    <CheckCircle size={15} color="#10b981" />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <strong>{item.author || 'Manager'}</strong>
                      <span className="timeline-role">({item.role || 'Reviewer'})</span>
                      <span className={`status-badge-inline ${(item.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                        {item.status || 'LOG'}
                      </span>
                      <span className="timeline-time">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                      </span>
                    </div>
                    {item.comment && (
                      <div className="timeline-text">{item.comment}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Filter leads table data based on stage and sub-stage
  let currentWorkflow = 'dtf';
  let currentStage = '';
  let currentSubStage = '';

  const parts = pathParts.map((p) => p.toLowerCase());
  if (parts.includes('embroidery')) {
    currentWorkflow = 'embroidery';
  } else if (parts.includes('dtf')) {
    currentWorkflow = 'dtf';
  }

  const cleanParts = parts.filter((p) => p !== 'order' && p !== 'dtf' && p !== 'embroidery');

  if (cleanParts.length >= 2) {
    currentStage = cleanParts[0];
    currentSubStage = cleanParts[1];
  } else if (cleanParts.length === 1) {
    const only = cleanParts[0];
    if (['sample', 'partial', 'complete'].includes(only)) {
      currentStage = only;
      currentSubStage = 'order';
    } else if (only === 'customer-support') {
      currentStage = 'complete';
      currentSubStage = 'customer-support';
    } else {
      currentSubStage = only;
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

    const info = getLeadStageInfo(item, currentStage, currentSubStage, currentWorkflow);
    if (!info.matches) return false;

    if (tableSearch.trim()) {
      const term = tableSearch.toLowerCase().trim();
      const oid = (item.orderId || (item._id ? `ORD-${String(item._id).slice(-5)}` : '')).toLowerCase();
      const comp = (item.companyName || '').toLowerCase();
      const client = (item.clientName || '').toLowerCase();
      const emp = (item.employeeName || '').toLowerCase();
      const phone = (item.phoneNumber || '').toLowerCase();
      if (!oid.includes(term) && !comp.includes(term) && !client.includes(term) && !emp.includes(term) && !phone.includes(term)) {
        return false;
      }
    }

    return true;
  });

  const matchingLeads = allStageLeads;

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
    else if (fromUrl.includes('/staging-ground') || fromUrl.includes('/staging-room')) activeSub = 'staging-room';
    else if (fromUrl.includes('/ready-to-pick-up')) activeSub = 'ready-to-pick-up';
    else if (fromUrl.includes('/quality-check')) activeSub = 'quality-check';
    else if (fromUrl.includes('/packaging')) activeSub = 'packaging';
    else if (fromUrl.includes('/staging-room')) activeSub = 'staging-room';
    else if (fromUrl.includes('/payment-confirmation')) activeSub = 'payment-confirmation';
    else if (fromUrl.includes('/delivery-pending')) activeSub = 'delivery-pending';
    else if (fromUrl.includes('/delivered')) activeSub = 'delivered';
    else if (fromUrl.includes('/customer-support')) activeSub = 'customer-support';
    else if (fromUrl.includes('/printing')) activeSub = 'printing';
    else if (fromUrl.includes('/stock')) activeSub = 'stock';
    else if (fromUrl.includes('/dtf-pending')) activeSub = 'dtf-pending';

    const isExecutionStageView = Boolean(
      editId && (
        activeSub === 'dtf-pending' ||
        activeSub === 'stock' ||
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

    const resolvedOrderStage = (searchParams.get('stage') || (fromUrl.match(/\/order\/(sample|partial|complete)/)?.[1]) || currentStage || orderApprovalData?.orderStage || 'sample').toLowerCase();
    const isSamplePrinting = resolvedOrderStage === 'sample' && activeSub === 'printing';
    const isSampleReadyToPickup = resolvedOrderStage === 'sample' && activeSub === 'ready-to-pick-up';
    const isSampleStagingGround = resolvedOrderStage === 'sample' && (activeSub === 'staging-ground' || activeSub === 'staging-room');
    const isSampleCustomerApproval = resolvedOrderStage === 'sample' && activeSub === 'customer-approval-awaiting';
    let isTopSubmitDisabled = false;
    if (editId) {
      if (isSamplePrinting) {
        isTopSubmitDisabled =
          stageForm.stockSampleReceived === 'no' ||
          stageForm.prodSampleReceived === 'no' ||
          stageForm.stockSampleReceived !== 'yes' ||
          stageForm.prodSampleReceived !== 'yes' ||
          stageForm.stageStatus !== 'Complete';
      } else if (isSampleReadyToPickup) {
        isTopSubmitDisabled =
          stageForm.printingSampleReceived === 'no' ||
          stageForm.printingSampleReceived !== 'yes' ||
          stageForm.stageStatus !== 'Complete';
      } else if (isSampleStagingGround) {
        isTopSubmitDisabled =
          stageForm.readyToPickSampleReceived === 'no' ||
          stageForm.readyToPickSampleReceived !== 'yes' ||
          stageForm.stageStatus !== 'Complete' ||
          Boolean(!stageForm.rackNo || !stageForm.rackNo.trim());
      } else if (isSampleCustomerApproval) {
        isTopSubmitDisabled =
          !stageForm.customerApproved ||
          (stageForm.customerApproved === 'yes' && !stageForm.paymentStatus);
      }
    }

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
              <span>{searchParams.get('from')?.includes('/approvals') || isLeadManager ? 'Back to Approvals' : searchParams.get('from')?.includes('/order/leads') || (query || '').toLowerCase().trim() === 'lead' ? 'Back to Leads' : searchParams.get('from')?.endsWith('/all') ? 'Back to All' : 'Back to Order'}</span>
            </button>

            {/* Top Right Action Buttons opposite to Back to Order */}
            {isExecutionStageView ? (
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
                  id="btn-stage-save-top"
                  onClick={() => handleExecuteStageTransition('save')}
                  disabled={submittingStageAction}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: submittingStageAction ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <Save size={15} />
                  <span>{submittingStageAction ? 'Saving...' : 'Save'}</span>
                </button>

                <button
                  type="button"
                  id="btn-stage-submit-top"
                  onClick={() => handleExecuteStageTransition('submit')}
                  disabled={submittingStageAction || isTopSubmitDisabled}
                  title={
                    isTopSubmitDisabled
                      ? (isSampleStagingGround && stageForm.readyToPickSampleReceived === 'yes' && !stageForm.rackNo?.trim()
                          ? 'Please enter rack number to submit'
                          : isSampleCustomerApproval && stageForm.customerApproved === 'yes' && !stageForm.paymentStatus
                          ? 'Please select payment status to submit'
                          : isSampleCustomerApproval && !stageForm.customerApproved
                          ? 'Please select whether customer approved sample'
                          : 'Cannot submit while sample is not received or order is On Hold')
                      : ''
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: (isSamplePrinting || isSampleReadyToPickup || isSampleStagingGround || isSampleCustomerApproval)
                      ? (isTopSubmitDisabled
                          ? '#94a3b8'
                          : (isSampleCustomerApproval && stageForm.customerApproved === 'no')
                          ? '#dc2626'
                          : '#10b981')
                      : '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 22px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: (submittingStageAction || isTopSubmitDisabled) ? 'not-allowed' : 'pointer',
                    boxShadow: isTopSubmitDisabled ? 'none' : '0 2px 6px rgba(0,0,0,0.15)',
                    opacity: isTopSubmitDisabled ? 0.65 : 1,
                  }}
                >
                  <CheckCircle size={15} />
                  <span>
                    {submittingStageAction
                      ? 'Processing...'
                      : isTopSubmitDisabled
                      ? ((isSamplePrinting && (stageForm.stockSampleReceived === 'no' || stageForm.prodSampleReceived === 'no')) ||
                         (isSampleReadyToPickup && stageForm.printingSampleReceived === 'no') ||
                         (isSampleStagingGround && stageForm.readyToPickSampleReceived === 'no')
                          ? 'On Hold'
                          : 'Submit')
                      : (isSampleCustomerApproval && stageForm.customerApproved === 'no')
                      ? 'Return to Order'
                      : 'Submit'}
                  </span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {(isLeadManager || (isLeadManagerOrAdmin && searchParams.get('from')?.includes('/approvals'))) ? (
                  isLeadSubmitted ? (
                    <button
                      type="button"
                      disabled={true}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 22px',
                        borderRadius: '8px',
                        background: '#10b981',
                        border: 'none',
                        color: '#fff',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: 'not-allowed',
                        opacity: 0.95,
                        boxShadow: '0 2px 6px rgba(16,185,129,0.2)'
                      }}
                      title="Order already submitted & approved"
                    >
                      <CheckCircle size={16} />
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
                        padding: '9px 24px',
                        borderRadius: '8px',
                        background: '#059669',
                        border: 'none',
                        color: '#fff',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: submittingLeadAction ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(5,150,105,0.25)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <CheckCircle size={16} />
                      <span>{submittingLeadAction ? 'Submitting...' : 'Submit'}</span>
                    </button>
                  )
                ) : (
                  isReadOnly ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="btn-primary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 20px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Edit2 size={15} />
                      <span>{(query || '').toLowerCase().trim() === 'lead' ? 'Edit Lead' : 'Edit Order'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '9px 18px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={15} />
                        <span>Cancel</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveExistingOrder}
                        className="btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '9px 22px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Check size={15} />
                        <span>Save Changes</span>
                      </button>
                    </>
                  )
                )}
              </div>
            )}
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
          {editId && (query || '').toLowerCase().trim() === 'order' && renderDefinitionBar()}
          {editId && (query || '').toLowerCase().trim() === 'order' && renderChangeManagementBar()}

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
          {editId && !orderApprovalData && isExecutionStageView && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <Clock size={22} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '8px' }} />
              <div>Loading order stage details...</div>
            </div>
          )}
          {editId && orderApprovalData && renderStageWorkflowCard()}



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
                  <label>Order ID</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    placeholder="ORD00001"
                    style={{ background: 'rgba(0,0,0,0.02)', fontWeight: 600, color: '#1e40af' }}
                  />
                </div>

                <div className="form-group">
                  <label>Employee Name</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={formData.employeeName !== undefined ? formData.employeeName : (editId && orderApprovalData?.employeeName ? orderApprovalData.employeeName : (currentUser?.name || ''))}
                    onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                    style={{ background: 'rgba(0,0,0,0.02)', color: '#0f172a' }}
                  />
                </div>
                
                <div className="form-group">
                  <label>Query</label>
                  <select value={query} onChange={(e) => setQuery(e.target.value)} disabled={isReadOnly}>
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
                  <label>Company Name {(query || '').toLowerCase().trim() === 'order' ? '*' : ''}</label>
                  <input
                    type="text"
                    required={(query || '').toLowerCase().trim() === 'order'}
                    disabled={isReadOnly}
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Client Name {(query || '').toLowerCase().trim() === 'order' ? '*' : ''}</label>
                  <input
                    type="text"
                    required={(query || '').toLowerCase().trim() === 'order'}
                    disabled={isReadOnly}
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Company Address {(query || '').toLowerCase().trim() === 'order' ? '*' : ''}</label>
                  <input
                    type="text"
                    required={(query || '').toLowerCase().trim() === 'order'}
                    disabled={isReadOnly}
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>State {(query || '').toLowerCase().trim() === 'order' ? '*' : ''}</label>
                  <select
                    required={(query || '').toLowerCase().trim() === 'order'}
                    disabled={isReadOnly}
                    value={(formData.state || '').toUpperCase()}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    style={{ textTransform: 'uppercase' }}
                  >
                    <option value="">SELECT STATE / UNION TERRITORY</option>
                    {formData.state && !INDIAN_STATES.includes((formData.state || '').toUpperCase()) && (
                      <option value={(formData.state || '').toUpperCase()}>
                        {(formData.state || '').toUpperCase()}
                      </option>
                    )}
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Pincode {(query || '').toLowerCase().trim() === 'order' ? '*' : ''}</label>
                  <input
                    type="text"
                    required={(query || '').toLowerCase().trim() === 'order'}
                    disabled={isReadOnly}
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
                      disabled={isReadOnly}
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
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: isReadOnly ? 'default' : 'pointer', fontWeight: 500, fontSize: '14px', margin: 0, color: '#334155' }}>
                      <input
                        type="radio"
                        name="repeatedOrder"
                        value="Yes"
                        disabled={isReadOnly}
                        checked={formData.repeatedOrder === 'Yes'}
                        onChange={(e) => setFormData({ ...formData, repeatedOrder: e.target.value })}
                        style={{ width: 'auto', margin: 0, cursor: isReadOnly ? 'default' : 'pointer', accentColor: '#2563eb' }}
                      />
                      Yes
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: isReadOnly ? 'default' : 'pointer', fontWeight: 500, fontSize: '14px', margin: 0, color: '#334155' }}>
                      <input
                        type="radio"
                        name="repeatedOrder"
                        value="No"
                        disabled={isReadOnly}
                        checked={formData.repeatedOrder === 'No' || !formData.repeatedOrder}
                        onChange={(e) => setFormData({ ...formData, repeatedOrder: e.target.value })}
                        style={{ width: 'auto', margin: 0, cursor: isReadOnly ? 'default' : 'pointer', accentColor: '#2563eb' }}
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
                        disabled={isReadOnly}
                        value={formData.scheduleDate}
                        onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                        style={{ flex: 1, padding: '10px' }}
                      />
                      <input
                        type="time"
                        disabled={isReadOnly}
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
                  disabled={isReadOnly}
                  value={formData.additionalNote}
                  onChange={(e) => setFormData({ ...formData, additionalNote: e.target.value })}
                  style={{ 
                    width: '100%', padding: '12px 14px', borderRadius: '8px', 
                    border: '1px solid #cbd5e1', background: 'white', color: '#334155', 
                    resize: 'vertical', fontFamily: 'inherit', outline: 'none'
                  }}
                ></textarea>
              </div>
              
              {!isSubmitted && !isLeadManager && (!editId || (!isReadOnly && (orderApprovalData?.query || 'lead').toLowerCase().trim() === 'lead')) && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
                  <button type="submit" name="save" className="btn-secondary" style={{ padding: '10px 24px' }}>
                    Save
                  </button>
                  <button 
                    type="submit" 
                    name="submit" 
                    className="btn-primary" 
                    disabled={!canSubmit} 
                    style={{ padding: '10px 24px', opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
                  >
                    Submit
                  </button>
                </div>
              )}
            </div>

            {/* MORE INFORMATION FORM */}
            {isSubmitted && (query || '').toLowerCase().trim() === 'order' && (
              <div className="form-section" style={{ marginTop: '24px' }}>
                <div className="form-section-title">Order Information</div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Order Stage *</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={(orderStage || 'sample').replace(/-/g, ' ')}
                      style={{
                        background: 'rgba(0,0,0,0.03)',
                        color: '#334155',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        cursor: 'not-allowed',
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Sub Stage *</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={((!subStage || subStage === 'new' || subStage === 'leads') ? 'order' : subStage).replace(/-/g, ' ')}
                      style={{
                        background: 'rgba(0,0,0,0.03)',
                        color: '#334155',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        cursor: 'not-allowed',
                      }}
                    />
                  </div>

                  {/* 1. Logo Design Attachment */}
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Paperclip size={15} style={{ color: '#2563eb' }} />
                      <span>Logo Design (Max 5)</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          ref={logoDesignInputRef}
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileChange('logoDesign', 'logoDesignName', e)}
                          style={{ display: 'none' }}
                          disabled={isReadOnly}
                        />
                        {!isReadOnly && (formData.logoDesignFiles?.length || 0) < 5 && (
                          <button
                            type="button"
                            onClick={() => logoDesignInputRef.current?.click()}
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
                            {(formData.logoDesignFiles?.length || 0) > 0 ? `Add Files (${formData.logoDesignFiles.length}/5)` : 'Upload Files'}
                          </button>
                        )}
                        {(formData.logoDesignFiles?.length || 0) === 0 && (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            No file chosen
                          </span>
                        )}
                      </div>
                      {(formData.logoDesignFiles?.length || 0) > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {formData.logoDesignFiles.map((fileObj, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>{idx + 1}.</span>
                              <a
                                href={fileObj.data}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={fileObj.name || `logo-design-${idx + 1}`}
                                title={fileObj.name}
                                style={{
                                  fontSize: '12px',
                                  color: '#2563eb',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  textDecoration: 'underline',
                                  maxWidth: '160px'
                                }}
                              >
                                {fileObj.name || `File ${idx + 1}`}
                              </a>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile('logoDesign', 'logoDesignName', logoDesignInputRef, idx)}
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
                                  title="Remove file"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Digital Design Attachment */}
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Paperclip size={15} style={{ color: '#2563eb' }} />
                      <span>Digital Design (Max 5)</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          ref={digitalDesignInputRef}
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileChange('digitalDesign', 'digitalDesignName', e)}
                          style={{ display: 'none' }}
                          disabled={isReadOnly}
                        />
                        {!isReadOnly && (formData.digitalDesignFiles?.length || 0) < 5 && (
                          <button
                            type="button"
                            onClick={() => digitalDesignInputRef.current?.click()}
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
                            {(formData.digitalDesignFiles?.length || 0) > 0 ? `Add Files (${formData.digitalDesignFiles.length}/5)` : 'Upload Files'}
                          </button>
                        )}
                        {(formData.digitalDesignFiles?.length || 0) === 0 && (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            No file chosen
                          </span>
                        )}
                      </div>
                      {(formData.digitalDesignFiles?.length || 0) > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {formData.digitalDesignFiles.map((fileObj, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>{idx + 1}.</span>
                              <a
                                href={fileObj.data}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={fileObj.name || `digital-design-${idx + 1}`}
                                title={fileObj.name}
                                style={{
                                  fontSize: '12px',
                                  color: '#2563eb',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  textDecoration: 'underline',
                                  maxWidth: '160px'
                                }}
                              >
                                {fileObj.name || `File ${idx + 1}`}
                              </a>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile('digitalDesign', 'digitalDesignName', digitalDesignInputRef, idx)}
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
                                  title="Remove file"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Logo Name</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={formData.logoName}
                      onChange={(e) => setFormData({ ...formData, logoName: e.target.value })}
                      placeholder="Enter logo name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Quantity (pcs) *</label>
                    <div>
                      <input
                        type="number"
                        required
                        disabled={isReadOnly}
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
                      disabled={isReadOnly}
                      value={formData.pricePerPiece}
                      onChange={(e) => setFormData({ ...formData, pricePerPiece: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Amount *</label>
                    <input
                      type="number"
                      required
                      disabled={isReadOnly}
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>GST (in percentage)</label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={isReadOnly}
                      value={formData.gst}
                      onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Net Amount *</label>
                    <input
                      type="number"
                      required
                      disabled={isReadOnly}
                      value={formData.netAmount}
                      onChange={(e) => setFormData({ ...formData, netAmount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Advance Amount *</label>
                    <input
                      type="number"
                      required
                      disabled={isReadOnly}
                      value={formData.advanceAmount}
                      onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Pending Amount *</label>
                    <input
                      type="number"
                      required
                      disabled={isReadOnly}
                      value={formData.pendingAmount}
                      onChange={(e) => setFormData({ ...formData, pendingAmount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Urgency *</label>
                    <select
                      required
                      disabled={isReadOnly}
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
                      disabled={isReadOnly || formData.urgency?.toLowerCase() !== 'yes'}
                      style={
                        isReadOnly || formData.urgency?.toLowerCase() !== 'yes'
                          ? { background: 'rgba(0,0,0,0.03)', cursor: isReadOnly ? 'default' : 'not-allowed', color: '#64748b' }
                          : {}
                      }
                      title={formData.urgency?.toLowerCase() !== 'yes' ? "Only editable when Urgency is 'Yes'" : ""}
                    />
                  </div>

                  <div className="form-group">
                    <label>Mode of Delivery</label>
                    <select
                      disabled={isReadOnly}
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
                      {!isReadOnly && (
                        <button type="button" onClick={handleAddItem} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Plus size={16} /> Add Item *
                        </button>
                      )}
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
                      {items.map((item, itemIdx) => (
                        <div
                          key={item.id || item._id || `item-row-${itemIdx}`}
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
                              disabled={isReadOnly}
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
                                disabled={isReadOnly}
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

                          {(isTshirt(item) || item.itemType === 'others') && (
                            <div style={{ flex: '1.2 1 125px', minWidth: '115px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Printing Type</label>
                              <select
                                disabled={isReadOnly}
                                value={item.printingType || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleItemChange(item.id, {
                                    printingType: val,
                                    ...(val !== 'Sublimation' ? { sublimationOption: '', sublimation: '' } : {})
                                  });
                                }}
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
                                disabled={isReadOnly}
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
                              disabled={isReadOnly}
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
                              disabled={isReadOnly}
                              value={item.quantity || ''}
                              onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div style={{ flex: '0.8 1 75px', minWidth: '65px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Size *</label>
                            <select
                              required
                              disabled={isReadOnly}
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
                              disabled={isReadOnly}
                              value={item.color || ''}
                              onChange={(e) => handleItemChange(item.id, 'color', e.target.value)}
                              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                          {!isReadOnly && (
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
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {!isLeadManager && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                    {editId && isReadOnly && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 28px' }}
                      >
                        <Edit2 size={16} /> Edit Order
                      </button>
                    )}

                    {editId && !isReadOnly && (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="btn-secondary"
                          style={{ padding: '10px 24px' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveExistingOrder}
                          className="btn-primary"
                          style={{ padding: '10px 32px' }}
                        >
                          {(orderApprovalData?.query || 'lead').toLowerCase().trim() !== 'order' && (query || '').toLowerCase().trim() === 'order'
                            ? 'Submit'
                            : 'Save Changes'}
                        </button>
                      </>
                    )}

                    {!editId && (
                      <button
                        type="button"
                        onClick={handleOrderSubmit}
                        className="btn-primary"
                        style={{ padding: '10px 32px' }}
                      >
                        Submit
                      </button>
                    )}
                  </div>
                )}

                {/* Refer Back with additional note at the bottom of the form for Lead Manager / Approval Review */}
                {editId && (isLeadManager || (isLeadManagerOrAdmin && searchParams.get('from')?.includes('/approvals'))) && !isExecutionStageView && (
                  <div className="lead-manager-refer-back-box" style={{
                    marginTop: '24px'
                  }}>
                    {leadAppr.note && (
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        marginBottom: '12px',
                        fontSize: '13px',
                        color: '#334155'
                      }}>
                        <strong style={{ color: '#475569' }}>
                          Previous Manager Note:
                        </strong>{' '}
                        <span>&ldquo;{leadAppr.note}&rdquo;</span>
                        {leadAppr.author && (
                          <span style={{ fontSize: '11.5px', color: '#64748b', marginLeft: '8px' }}>
                            — {leadAppr.author} {leadAppr.updatedAt ? `on ${new Date(leadAppr.updatedAt).toLocaleDateString()}` : ''}
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ marginBottom: '12px' }}>
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
                          boxSizing: 'border-box',
                          background: '#ffffff'
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
                          padding: '8px 20px',
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
                        <span>{submittingLeadAction ? 'Processing...' : 'Refer Back'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            </form>
          )}

          {/* ACTIVITY LOG SECTION (Shown in all opened applications across all profiles and stages) */}
          {Boolean(editId) && (
            <div
              className="order-tasks-wrapper"
              style={{
                marginTop: '20px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              }}
            >
              <div
                className="tasks-section-header"
                style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '18px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '14px',
                }}
              >
                <div className="tasks-section-title" style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Activity Log
                </div>

                {/* Three Horizontal Mini Tabs (Left Aligned next to Activity Log) */}
                <div
                  style={{
                    display: 'inline-flex',
                    background: '#f1f5f9',
                    padding: '3px',
                    borderRadius: '8px',
                    gap: '4px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {[
                    { key: 'department', label: 'Department Log' },
                    { key: 'application', label: 'Application Log' },
                    { key: 'inventory', label: 'Inventory Log' },
                  ].map((tab) => {
                    const isActive = activeActivityTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveActivityTab(tab.key)}
                        style={{
                          border: 'none',
                          background: isActive ? '#ffffff' : 'transparent',
                          color: isActive ? '#2563eb' : '#475569',
                          fontWeight: isActive ? 700 : 600,
                          fontSize: '12.5px',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MINI TAB 1: DEPARTMENT LOG */}
              {activeActivityTab === 'department' && (
                (() => {
                  const isLeadApproved =
                    leadAppr.status === 'Approved' ||
                    orderApprovalData?.leadApproval?.status === 'Approved' ||
                    orderApprovalData?.approvalStatus === 'Approved' ||
                    Boolean(
                      orderApprovalData?.dtfPendingAt ||
                      orderApprovalData?.stockAt ||
                      orderApprovalData?.printingAt ||
                      orderApprovalData?.readyToPickUpAt ||
                      orderApprovalData?.stagingRoomAt ||
                      orderApprovalData?.customerApprovalAwaitingAt ||
                      orderApprovalData?.completedAt
                    );

                  if (!isLeadApproved) {
                    return (
                      <div
                        style={{
                          padding: '24px 20px',
                          textAlign: 'center',
                          color: '#64748b',
                          fontSize: '13.5px',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px dashed #cbd5e1',
                        }}
                      >
                        No tasks assigned yet. Department tasks will be initiated once the Lead Manager approves the order.
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

                      {/* Task 2 - Production Room (Only for DTF workflows; Embroidery has single Stock Room task) */}
                      {!isOrderEmbroidery(orderApprovalData || { printingType: formData?.printingType, items }) && (
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
                      )}
                    </div>
                  );
                })()
              )}

              {/* MINI TAB 2: APPLICATION LOG */}
              {activeActivityTab === 'application' && (() => {
                const d = orderApprovalData || {};
                const rawLogs = Array.isArray(d.activityLogs) ? d.activityLogs : [];
                const combinedLogs = [];

                const normStage = (d.orderStage || 'sample').toLowerCase().trim();
                const normSub = (d.subStage || 'order').toLowerCase().trim().replace(/\s+/g, '-');
                const isOrd = (d.query || query || 'lead').toLowerCase().trim() === 'order';
                const sampleSubOrder = ['order', 'dtf-pending', 'stock', 'printing', 'ready-to-pick-up', 'staging-ground', 'customer-approval-awaiting'];
                const curSampleIdx = normStage === 'sample' ? (normSub === 'staging-room' ? 5 : sampleSubOrder.indexOf(normSub)) : sampleSubOrder.length;

                const hasLogMatching = (regex) =>
                  rawLogs.some((l) => regex.test(`${l.action || ''} ${l.stage || ''} ${l.details || ''}`));

                // 1. Creation Log
                if (!hasLogMatching(/created/i) && (d._id || editId)) {
                  const initChanges = [];
                  if (d.orderId || formData.orderId) initChanges.push(`Order ID: ${d.orderId || formData.orderId}`);
                  if (d.employeeName || formData.employeeName) initChanges.push(`Employee Name: ${d.employeeName || formData.employeeName}`);
                  initChanges.push(`Query Type: ${isOrd ? 'order' : 'lead'}`);
                  if (d.companyName || formData.companyName) initChanges.push(`Company Name: ${d.companyName || formData.companyName}`);
                  if (d.clientName || formData.clientName) initChanges.push(`Client Name: ${d.clientName || formData.clientName}`);
                  if (d.phoneNumber || formData.phoneNumber) initChanges.push(`Phone Number: ${d.phoneNumber || formData.phoneNumber}`);
                  if (isOrd) {
                    if (d.totalQuantity) initChanges.push(`Total Quantity: ${d.totalQuantity} pcs`);
                    if (d.totalAmount) initChanges.push(`Total Amount: ₹${d.totalAmount}`);
                    if (d.netAmount) initChanges.push(`Net Amount: ₹${d.netAmount}`);
                    if (Array.isArray(d.items) && d.items.length > 0) {
                      d.items.forEach((it, idx) => {
                        const name = it.item || it.enterItem || it.itemType || 'Item';
                        initChanges.push(
                          `Item #${idx + 1} (${name}): Printing: ${it.printingType || '-'}, Fabric: ${it.fabric || '-'}, Qty: ${it.quantity || 0} pcs, Size: ${it.size || '-'}, Color: ${it.color || '-'}`
                        );
                      });
                    }
                  }
                  combinedLogs.push({
                    action: isOrd ? 'Order Created & Submitted' : 'Lead Created & Saved',
                    stage: isOrd ? 'Sample → Order' : 'Leads',
                    performedBy: d.employeeName || formData.employeeName || 'Sales Executive',
                    role: 'Sales Executive',
                    details: isOrd
                      ? `Application (${d.orderId || formData.orderId || 'Order'}) created and submitted by ${d.employeeName || 'Sales Executive'}. Sent to Sample → Order for Lead Manager Clearance.`
                      : `Lead application (${d.orderId || formData.orderId || 'Lead'}) created and saved to Leads by ${d.employeeName || 'Sales Executive'}.`,
                    changes: initChanges,
                    timestamp: d.createdAt || new Date().toISOString(),
                  });
                }

                // 2. Task 0 - Lead Manager Clearance & Move to DTF Pending
                const leadManagerApproved =
                  d.leadApproval?.status === 'Approved' ||
                  curSampleIdx >= 1 ||
                  normStage === 'partial' ||
                  normStage === 'complete' ||
                  (Array.isArray(d.approvalComments) && d.approvalComments.some((c) => /lead manager/i.test(c.role || '') && c.status === 'Approved'));

                if (isOrd && leadManagerApproved && !hasLogMatching(/Task 0|Lead Manager Approved/i)) {
                  const lmComment = Array.isArray(d.approvalComments)
                    ? d.approvalComments.find((c) => /lead manager/i.test(c.role || '') && c.status === 'Approved')
                    : null;
                  const lmAuthor = d.leadApproval?.author || lmComment?.author || 'Sarah Jenkins';
                  const lmNote = d.leadApproval?.note || lmComment?.comment || 'Approved by Lead Manager';
                  combinedLogs.push({
                    action: 'Task 0 - Approved by Lead Manager (Moved to DTF Pending)',
                    stage: 'Sample → DTF Pending',
                    performedBy: lmAuthor,
                    role: 'Lead Manager',
                    details: `Task 0 (Lead Manager Clearance) approved by ${lmAuthor} (Lead Manager). Application moved from Sample → Order to Sample → DTF Pending, and assigned to Stock Room Manager (Elena Rostova) & Production Room (Marcus Vance).`,
                    changes: [
                      'From Stage: Sample → Order',
                      'To Stage: Sample → DTF Pending',
                      'Task 0 (Lead Manager Clearance): Approved',
                      'Assigned Task 1: Stock Room Clearance (Elena Rostova — Verification)',
                      'Assigned Task 2: Production Room Clearance (Marcus Vance — Logo Printing)',
                      ...(lmNote ? [`Lead Manager Note: "${lmNote}"`] : []),
                    ],
                    timestamp: d.leadApproval?.updatedAt || lmComment?.createdAt || d.createdAt,
                  });
                }

                // 3. Stock Room Manager Flow (Verification -> Ready to Pick -> Staging Room -> Task 1 Approved)
                const stStage = (d.stockTaskStage || '').toLowerCase();
                const stData = d.stockTaskData || {};
                const isStockVerified =
                  stData.verificationSubmitted ||
                  ['ready_to_pick', 'staging_room', 'completed'].includes(stStage) ||
                  d.stockApproval?.status === 'Approved';
                const isStockReadyToPickDone =
                  stData.readyToPickSubmitted ||
                  ['staging_room', 'completed'].includes(stStage) ||
                  d.stockApproval?.status === 'Approved';
                const isStockApproved =
                  stStage === 'completed' || d.stockApproval?.status === 'Approved';

                if (isOrd && isStockVerified && !hasLogMatching(/Stock Task - Verification|Verification Submitted|Verification Completed/i)) {
                  const sampleQty = stData.sampleDeduction !== undefined ? stData.sampleDeduction : 1;
                  const stockChanges = [
                    'From: Sample → DTF Pending / Task 1 Stock Room (Verification)',
                    'To: Stock Room → Ready to Pick',
                    `Stock Availability Verified: ${stData.isStockAvailable === false ? 'Partial / Deficit Noted' : 'Yes (In Stock)'}`,
                    `Sample Quantity Allocated: ${sampleQty} pcs`,
                  ];
                  if (stData.stockDepreciation) {
                    stockChanges.push(`Remaining Stock After Sample Deduction: ${stData.stockDepreciation}`);
                  }
                  combinedLogs.push({
                    action: 'Stock Room Manager - Verification Completed (Moved to Ready to Pick)',
                    stage: 'Stock Room → Ready to Pick',
                    performedBy: d.stockApproval?.author || 'Elena Rostova',
                    role: 'Stock Room Manager',
                    details: `Stock Room inventory verification completed by ${d.stockApproval?.author || 'Elena Rostova'} (Stock Room Manager). Application moved from Stock Verification to Ready to Pick.`,
                    changes: stockChanges,
                    timestamp: stData.verifiedAt || d.stockApproval?.updatedAt || d.updatedAt || d.createdAt,
                  });
                }

                if (isOrd && isStockReadyToPickDone && !hasLogMatching(/Stock Task - Ready To Pick|Ready to Pick Submitted|Ready to Pick Completed/i)) {
                  combinedLogs.push({
                    action: 'Stock Room Manager - Ready to Pick Completed (Moved to Staging Room)',
                    stage: 'Stock Room → Staging Room',
                    performedBy: d.stockApproval?.author || 'Elena Rostova',
                    role: 'Stock Room Manager',
                    details: `Sample items picked and verified in Ready to Pick by ${d.stockApproval?.author || 'Elena Rostova'} (Stock Room Manager). Application moved from Ready to Pick to Staging Room.`,
                    changes: [
                      'From: Stock Room → Ready to Pick',
                      'To: Stock Room → Staging Room',
                      `Sample Received in Ready to Pick: ${stData.readyToPickReceived === false ? 'No' : 'Yes'}`,
                    ],
                    timestamp: stData.readyToPickAt || d.stockApproval?.updatedAt || d.updatedAt || d.createdAt,
                  });
                }

                if (isOrd && isStockApproved && !hasLogMatching(/Task 1 - Stock Room Approved/i)) {
                  const stAuthor = d.stockApproval?.author || 'Elena Rostova';
                  const stNote = d.stockApproval?.note || 'Approved by Stock Room';
                  combinedLogs.push({
                    action: 'Task 1 - Stock Room Clearance Approved',
                    stage: 'Stock Room → Approved',
                    performedBy: stAuthor,
                    role: 'Stock Room Manager',
                    details: `Staging Room verification completed and Task 1 (Stock Room Clearance) approved by ${stAuthor} (Stock Room Manager). Stock items released to Sample → Stock / Printing.`,
                    changes: [
                      'From: Stock Room → Staging Room',
                      'To: Task 1 Stock Room Clearance Approved (Released to Sample → Stock / Printing)',
                      'Task 1 Status: Approved',
                      `Sample Quantity Released: ${stData.sampleDeduction !== undefined ? stData.sampleDeduction : 1} pcs`,
                      ...(stNote ? [`Stock Room Note: "${stNote}"`] : []),
                    ],
                    timestamp: stData.stagingApprovedAt || d.stockApproval?.updatedAt || d.updatedAt || d.createdAt,
                  });
                }

                // 4. Production Room Flow (Logo Printing -> Logo Cutting -> Task 2 Approved)
                const prStage = (d.productionTaskStage || '').toLowerCase();
                const prData = d.productionTaskData || {};
                const isLogoPrintingDone =
                  prData.printingSubmitted ||
                  ['logo_cutting', 'completed'].includes(prStage) ||
                  d.productionApproval?.status === 'Approved';
                const isProdApproved =
                  prStage === 'completed' || d.productionApproval?.status === 'Approved';

                if (isOrd && isLogoPrintingDone && !hasLogMatching(/Logo Printing Submitted|Logo Printing Completed/i)) {
                  const prChanges = [
                    'From: Sample → DTF Pending / Task 2 Production Room (Logo Printing)',
                    'To: Production Room → Logo Cutting',
                  ];
                  if (prData.logosPrinted !== undefined && prData.logosPrinted !== '') {
                    prChanges.push(`Logos Printed: ${prData.logosPrinted} pcs`);
                  }
                  if (prData.logosGivenForCutting !== undefined && prData.logosGivenForCutting !== '') {
                    prChanges.push(`Logos Given for Cutting: ${prData.logosGivenForCutting} pcs`);
                  }
                  combinedLogs.push({
                    action: 'Production Room - Logo Printing Completed (Moved to Logo Cutting)',
                    stage: 'Production Room → Logo Cutting',
                    performedBy: d.productionApproval?.author || 'Marcus Vance',
                    role: 'Production Lead',
                    details: `DTF / Logo Printing completed in Production Room by ${d.productionApproval?.author || 'Marcus Vance'} (Production Lead). Application moved from Logo Printing to Logo Cutting.`,
                    changes: prChanges,
                    timestamp: d.productionApproval?.updatedAt || d.updatedAt || d.createdAt,
                  });
                }

                if (isOrd && isProdApproved && !hasLogMatching(/Task 2 - Production Approved|Task 2 - Production Room Approved/i)) {
                  const prAuthor = d.productionApproval?.author || 'Marcus Vance';
                  const prNote = d.productionApproval?.note || 'Approved by Production Lead';
                  const prApproveChanges = [
                    'From: Production Room → Logo Cutting',
                    'To: Task 2 Production Room Clearance Approved (Released to Sample → Stock / Printing)',
                    'Task 2 Status: Approved',
                  ];
                  if (prData.logosForPrinting !== undefined && prData.logosForPrinting !== '') {
                    prApproveChanges.push(`Logos for Printing: ${prData.logosForPrinting} pcs`);
                  }
                  if (prData.sampleLogosCount !== undefined && prData.sampleLogosCount !== '') {
                    prApproveChanges.push(`Sample Logos Released: ${prData.sampleLogosCount} pcs`);
                  }
                  if (prNote) {
                    prApproveChanges.push(`Production Note: "${prNote}"`);
                  }
                  combinedLogs.push({
                    action: 'Task 2 - Production Room Clearance Approved',
                    stage: 'Production Room → Approved',
                    performedBy: prAuthor,
                    role: 'Production Lead',
                    details: `Logo Cutting completed and Task 2 (Production Room Clearance) approved by ${prAuthor} (Production Lead). DTF / Logo samples released to Sample → Stock / Printing.`,
                    changes: prApproveChanges,
                    timestamp: d.productionApproval?.updatedAt || d.updatedAt || d.createdAt,
                  });
                }

                // 5. How Application Came to Sample -> Stock (from DTF Pending / Stock Room & Production Clearance)
                if (isOrd && curSampleIdx >= 2 && !hasLogMatching(/Moved from DTF Pending to Sample → Stock|Moved to Sample → Stock/i)) {
                  combinedLogs.push({
                    action: 'Moved to Sample → Stock (From DTF Pending & Department Clearance)',
                    stage: 'Sample → Stock',
                    performedBy: d.employeeName || 'Sales / Operations',
                    role: 'Order Workflow',
                    details: `Application moved from Sample → DTF Pending (and Stock Room / Production Room processing) to Sample → Stock for physical inventory & stock allocation verification.`,
                    changes: [
                      'From Stage: Sample → DTF Pending (after Task 0 Lead Manager Clearance)',
                      'To Stage: Sample → Stock',
                      'DTF Film Preparation: Prepared, printed, and verified in DTF Pending',
                      `Stock Room Status (Task 1 - Elena Rostova): ${d.stockApproval?.status || (isStockVerified ? 'In Progress' : 'Pending')}`,
                      `Production Room Status (Task 2 - Marcus Vance): ${d.productionApproval?.status || (isLogoPrintingDone ? 'In Progress' : 'Pending')}`,
                    ],
                    timestamp: d.updatedAt || d.createdAt,
                  });
                }

                // 6. How Application Came to Sample -> Printing (from Sample -> Stock & Stock/Production Room Clearances)
                if (isOrd && curSampleIdx >= 3 && !hasLogMatching(/Moved to Printing|Moved from Stock to Sample → Printing|Moved to Sample → Printing/i)) {
                  combinedLogs.push({
                    action: 'Moved to Sample → Printing (From Sample → Stock & Department Clearances)',
                    stage: 'Sample → Printing',
                    performedBy:
                      d.stockApproval?.author && d.productionApproval?.author
                        ? `${d.stockApproval.author} & ${d.productionApproval.author}`
                        : d.employeeName || 'Operations',
                    role: 'Stock & Production Clearance',
                    details: `Application moved to Sample → Printing after Sample → Stock verification and both Task 1 (Stock Room Manager - Elena Rostova) & Task 2 (Production Lead - Marcus Vance) clearances were approved.`,
                    changes: [
                      'From Stage: Sample → Stock (with Stock Room & Production Room Clearances Approved)',
                      'To Stage: Sample → Printing',
                      'Stock Allocation: Verified and allocated for Printing stage',
                      `Stock Sample Released (Elena Rostova): ${stData.sampleDeduction !== undefined ? stData.sampleDeduction : 1} pcs`,
                      `Production Logo Sample Released (Marcus Vance): ${prData.sampleLogosCount !== undefined ? prData.sampleLogosCount : 1} pcs`,
                    ],
                    timestamp: d.productionApproval?.updatedAt || d.stockApproval?.updatedAt || d.updatedAt || d.createdAt,
                  });
                }

                // 7. How Application Came to Sample -> Ready to Pick Up (from Sample -> Printing)
                if (isOrd && curSampleIdx >= 4 && !hasLogMatching(/Moved from Printing to Sample → Ready To Pick Up|Moved to Sample → Ready to Pick Up/i)) {
                  const pData = d.printingStageData || {};
                  combinedLogs.push({
                    action: 'Moved to Sample → Ready to Pick Up (From Sample → Printing)',
                    stage: 'Sample → Ready to Pick Up',
                    performedBy: d.employeeName || 'Printing Operator',
                    role: 'Printing Stage',
                    details: `Sample Printing completed and verified. Application moved from Sample → Printing to Sample → Ready to Pick Up.`,
                    changes: [
                      'From Stage: Sample → Printing',
                      'To Stage: Sample → Ready to Pick Up',
                      `Stock Sample Received in Printing: ${pData.stockSampleReceived === 'no' ? 'No' : 'Yes'}`,
                      `Production Logo Received in Printing: ${pData.prodSampleReceived === 'no' ? 'No' : 'Yes'}`,
                      `Printed Count: ${pData.printedCount ?? 1} pcs`,
                      `Ready to Pick Up Count: ${pData.readyToPickupCount ?? 1} pcs`,
                    ],
                    timestamp: d.updatedAt || d.createdAt,
                  });
                }

                // 8. How Application Came to Sample -> Staging Ground (from Sample -> Ready to Pick Up)
                if (isOrd && curSampleIdx >= 5 && !hasLogMatching(/Moved from Ready To Pick Up to Sample → Staging Ground|Moved to Sample → Staging Ground/i)) {
                  const rtpData = d.sampleReadyToPickUpData || {};
                  combinedLogs.push({
                    action: 'Moved to Sample → Staging Ground (From Sample → Ready to Pick Up)',
                    stage: 'Sample → Staging Ground',
                    performedBy: d.employeeName || 'Staging Operator',
                    role: 'Ready to Pick Up Stage',
                    details: `Sample received from Printing in Ready to Pick Up and verified against client specifications. Application moved from Sample → Ready to Pick Up to Sample → Staging Ground.`,
                    changes: [
                      'From Stage: Sample → Ready to Pick Up',
                      'To Stage: Sample → Staging Ground',
                      'Sample Received from Printing: Yes',
                      `Final Samples for Staging Room: ${rtpData.stagingCount ?? rtpData.readyToPickupCount ?? 1} pcs`,
                    ],
                    timestamp: d.updatedAt || d.createdAt,
                  });
                }

                // 9. How Application Came to Sample -> Customer Approval Awaiting (from Sample -> Staging Ground)
                if (isOrd && curSampleIdx >= 6 && !hasLogMatching(/Moved from Staging Ground to Sample → Customer Approval Awaiting|Moved to Sample → Customer Approval Awaiting/i)) {
                  const sgData = d.sampleStagingGroundData || {};
                  combinedLogs.push({
                    action: 'Moved to Sample → Customer Approval Awaiting (From Sample → Staging Ground)',
                    stage: 'Sample → Customer Approval Awaiting',
                    performedBy: d.employeeName || 'Staging Operator',
                    role: 'Staging Ground Stage',
                    details: `Sample verified in Staging Ground${sgData.rackNo ? ` (Rack No: ${sgData.rackNo})` : ''}. Application moved from Sample → Staging Ground to Sample → Customer Approval Awaiting.`,
                    changes: [
                      'From Stage: Sample → Staging Ground',
                      'To Stage: Sample → Customer Approval Awaiting',
                      'Items Received from Ready to Pick: Yes',
                      ...(sgData.rackNo ? [`Staged on Rack No.: ${sgData.rackNo}`] : []),
                    ],
                    timestamp: d.updatedAt || d.createdAt,
                  });
                }

                // 10. Transition to Partial / Complete if applicable
                if (isOrd && (normStage === 'partial' || normStage === 'complete') && !hasLogMatching(/Partial →/i)) {
                  const caData = d.customerApprovalData || {};
                  combinedLogs.push({
                    action: 'Customer Sample Approved — Moved to Partial Stage',
                    stage: 'Partial → Order',
                    performedBy: d.employeeName || 'Sales Executive',
                    role: 'Sales Executive',
                    details: `Customer approved the sample in Sample → Customer Approval Awaiting. Application advanced from Sample stage to Partial → Order.`,
                    changes: [
                      'From Stage: Sample → Customer Approval Awaiting',
                      'To Stage: Partial → Order',
                      'Customer Approved Sample: Yes',
                      ...(caData.paymentStatus ? [`Payment Status: ${String(caData.paymentStatus).replace(/_/g, ' ')}`] : []),
                      ...(caData.amountReceived !== undefined ? [`Amount Received: ₹${caData.amountReceived}`] : []),
                    ],
                    timestamp: d.updatedAt || d.createdAt,
                  });
                }

                if (isOrd && normStage === 'complete' && !hasLogMatching(/Complete →/i)) {
                  combinedLogs.push({
                    action: 'Partial Payment Confirmed — Moved to Complete Stage',
                    stage: 'Complete → Order',
                    performedBy: d.employeeName || 'Sales Executive',
                    role: 'Sales Executive',
                    details: `Partial stage payment confirmation completed. Application advanced from Partial → Payment Confirmation to Complete → Order.`,
                    changes: [
                      'From Stage: Partial → Payment Confirmation',
                      'To Stage: Complete → Order',
                    ],
                    timestamp: d.updatedAt || d.createdAt,
                  });
                }

                // 11. Include any approvalComments not already covered
                if (Array.isArray(d.approvalComments) && d.approvalComments.length > 0) {
                  d.approvalComments.forEach((c) => {
                    const commentText = (c.comment || '').trim();
                    const isAlreadyCovered =
                      combinedLogs.some((l) => (l.changes || []).some((ch) => commentText && ch.includes(commentText))) ||
                      rawLogs.some((l) => (l.changes || []).some((ch) => commentText && ch.includes(commentText))) ||
                      (/lead manager/i.test(c.role || '') && c.status === 'Approved') ||
                      (/stock/i.test(c.role || '') && c.status === 'Approved' && isStockApproved) ||
                      (/production/i.test(c.role || '') && c.status === 'Approved' && isProdApproved);

                    if (!isAlreadyCovered) {
                      combinedLogs.push({
                        action: `${c.role || 'Department'} - ${c.status || 'Update'}`,
                        stage: d.orderStage ? `${d.orderStage.toUpperCase()} → ${(d.subStage || 'order').replace(/-/g, ' ').toUpperCase()}` : 'Sample → Order',
                        performedBy: c.author || 'Manager',
                        role: c.role || 'Manager',
                        details: c.comment || `Application ${c.status || 'updated'} by ${c.author || 'Manager'}.`,
                        changes: c.comment ? [`Note: "${c.comment}"`] : [],
                        timestamp: c.createdAt || d.updatedAt || d.createdAt,
                      });
                    }
                  });
                }

                // 12. Append all recorded activityLogs (Order Edited, Lead Edited, stage transitions, etc.)
                rawLogs.forEach((l) => combinedLogs.push(l));

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {combinedLogs.length === 0 ? (
                      <div
                        style={{
                          padding: '30px 20px',
                          textAlign: 'center',
                          color: '#64748b',
                          background: '#f8fafc',
                          borderRadius: '10px',
                          border: '1px dashed #cbd5e1',
                          fontSize: '13.5px',
                        }}
                      >
                        No application activity recorded yet.
                      </div>
                    ) : (
                      combinedLogs.map((logItem, idx) => {
                        const timeStr = logItem.timestamp
                          ? new Date(logItem.timestamp).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true,
                            })
                          : '—';
                        const isReferBack = /refer/i.test(logItem.action || '');
                        const isEdit = /edit/i.test(logItem.action || '');
                        const badgeBg = isReferBack ? '#fef2f2' : isEdit ? '#eff6ff' : '#ecfdf5';
                        const badgeColor = isReferBack ? '#dc2626' : isEdit ? '#2563eb' : '#059669';
                        const badgeBorder = isReferBack ? '#fecaca' : isEdit ? '#bfdbfe' : '#a7f3d0';

                        return (
                          <div
                            key={logItem._id || idx}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderLeft: `4px solid ${badgeColor}`,
                              borderRadius: '10px',
                              padding: '14px 18px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                flexWrap: 'wrap',
                                gap: '10px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: '5px',
                                    background: '#e2e8f0',
                                    color: '#334155',
                                  }}
                                >
                                  #{idx + 1}
                                </span>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                                  {logItem.action || 'Application Activity'}
                                </span>
                                {logItem.stage && (
                                  <span
                                    style={{
                                      fontSize: '11.5px',
                                      fontWeight: 600,
                                      padding: '2px 9px',
                                      borderRadius: '999px',
                                      background: badgeBg,
                                      color: badgeColor,
                                      border: `1px solid ${badgeBorder}`,
                                    }}
                                  >
                                    Stage: {logItem.stage}
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                                  By: <strong style={{ color: '#0f172a' }}>{logItem.performedBy || 'User'}</strong>
                                  {logItem.role ? ` (${logItem.role})` : ''}
                                </span>
                                <span
                                  style={{
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    color: '#64748b',
                                    background: '#ffffff',
                                    padding: '3px 9px',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0',
                                  }}
                                >
                                  {timeStr}
                                </span>
                              </div>
                            </div>

                            {logItem.details && (
                              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.45 }}>
                                {logItem.details}
                              </div>
                            )}

                            {Array.isArray(logItem.changes) && logItem.changes.length > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  padding: '9px 12px',
                                  marginTop: '2px',
                                }}
                              >
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                  Process Flow &amp; Captured Changes
                                </div>
                                {logItem.changes.map((chg, cIdx) => (
                                  <div
                                    key={cIdx}
                                    style={{
                                      fontSize: '12.5px',
                                      color: '#1e293b',
                                      fontWeight: 500,
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '6px',
                                    }}
                                  >
                                    <span style={{ color: '#2563eb', fontWeight: 700 }}>•</span>
                                    <span>{chg}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()}

              {/* MINI TAB 3: INVENTORY LOG (Kept empty as requested) */}
              {activeActivityTab === 'inventory' && (
                <div
                  style={{
                    minHeight: '100px',
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '10px',
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const ALL_TABLE_COLUMNS = [
    { key: 'orderId', label: 'Order ID' },
    { key: 'companyName', label: 'Company' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'phoneNumber', label: 'Phone' },
    { key: 'orderStage', label: 'Stage' },
    { key: 'subStage', label: 'Sub Stage' },
    { key: 'stageStatus', label: 'Stage Status' },
    ...(currentSubStage === 'printing' ? [{ key: 'printingStatus', label: 'Printing Status' }] : []),
    { key: 'totalQuantity', label: 'Quantity' },
    { key: 'clearanceStatus', label: 'Clearance Status' },
    { key: 'createdAt', label: 'Date' },
    { key: 'query', label: 'Query' },
    { key: 'clientName', label: 'Client Name' },
    { key: 'companyAddress', label: 'Company Address' },
    { key: 'state', label: 'State' },
    { key: 'pincode', label: 'Pincode' },
    { key: 'repeatedOrder', label: 'Repeated Order' },
    { key: 'additionalNote', label: 'Additional Note' },
    { key: 'logoName', label: 'Logo Name' },
    { key: 'pricePerPiece', label: 'Price Per Piece' },
    { key: 'totalAmount', label: 'Total Amount' },
    { key: 'gst', label: 'GST (%)' },
    { key: 'netAmount', label: 'Net Amount' },
    { key: 'advanceAmount', label: 'Advance Amount' },
    { key: 'pendingAmount', label: 'Pending Amount' },
    { key: 'urgency', label: 'Urgency' },
    { key: 'deliveryDate', label: 'Delivery Date' },
    { key: 'modeOfDelivery', label: 'Mode of Delivery' },
    { key: 'items', label: 'Add Items' },
    { key: 'action', label: 'Action' },
  ];

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <h2 style={{ textTransform: 'capitalize' }}>{currentSection || 'Order Management'}</h2>
      </div>
      
      <div className="chart-card hover-scale" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
        <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="chart-title-sec">
            <div>
              <h3 style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LayoutGrid size={16} color="#64748b" /> {currentSection || 'Order Management'}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }} ref={columnSettingsRef}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={15} color="#64748b" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search Order ID, company..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                style={{
                  padding: '7px 12px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  width: '220px',
                  outline: 'none',
                  background: '#ffffff',
                  color: '#1e293b',
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowColumnSettings((prev) => !prev)}
              title="Customize Table Columns"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: showColumnSettings ? '#eff6ff' : '#ffffff',
                color: showColumnSettings ? '#2563eb' : '#475569',
                cursor: 'pointer',
              }}
            >
              <Settings size={16} />
            </button>

            {showColumnSettings && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '240px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
                  padding: '10px 12px',
                  zIndex: 50,
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                  Show / Hide Columns
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {ALL_TABLE_COLUMNS.map((col) => (
                    <label
                      key={col.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12.5px',
                        color: '#334155',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(visibleColumns[col.key])}
                        onChange={() =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [col.key]: !prev[col.key],
                          }))
                        }
                        style={{ width: '14px', height: '14px', accentColor: '#2563eb', cursor: 'pointer', margin: 0 }}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {loadingLeads && leadsList.length === 0 ? (
          <div className="chart-body centered empty-chart" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Clock size={28} color="#94a3b8" style={{ animation: 'spin 1.5s linear infinite' }} />
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              Loading orders...
            </p>
          </div>
        ) : matchingLeads.length === 0 ? (
          <div className="chart-body centered empty-chart" style={{ flex: 1 }}>
            <p style={{ color: '#64748b', fontSize: '15px' }}>
              No data available for {currentSection || 'Order Management'} yet.
            </p>
          </div>
        ) : (
          <div style={{ padding: '16px 20px', overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {visibleColumns.orderId && <th style={{ padding: '10px 12px' }}>Order ID</th>}
                  {visibleColumns.companyName && <th style={{ padding: '10px 12px' }}>Company</th>}
                  {visibleColumns.employeeName && <th style={{ padding: '10px 12px' }}>Employee</th>}
                  {visibleColumns.phoneNumber && <th style={{ padding: '10px 12px' }}>Phone</th>}
                  {visibleColumns.orderStage && <th style={{ padding: '10px 12px' }}>Stage</th>}
                  {visibleColumns.subStage && <th style={{ padding: '10px 12px' }}>Sub Stage</th>}
                  {visibleColumns.stageStatus && <th style={{ padding: '10px 12px' }}>Stage Status</th>}
                  {currentSubStage === 'printing' && visibleColumns.printingStatus && <th style={{ padding: '10px 12px' }}>Printing Status</th>}
                  {visibleColumns.totalQuantity && <th style={{ padding: '10px 12px' }}>Quantity</th>}
                  {visibleColumns.clearanceStatus && <th style={{ padding: '10px 12px' }}>Clearance Status</th>}
                  {visibleColumns.createdAt && <th style={{ padding: '10px 12px' }}>Date</th>}
                  {visibleColumns.query && <th style={{ padding: '10px 12px' }}>Query</th>}
                  {visibleColumns.clientName && <th style={{ padding: '10px 12px' }}>Client Name</th>}
                  {visibleColumns.companyAddress && <th style={{ padding: '10px 12px' }}>Company Address</th>}
                  {visibleColumns.state && <th style={{ padding: '10px 12px' }}>State</th>}
                  {visibleColumns.pincode && <th style={{ padding: '10px 12px' }}>Pincode</th>}
                  {visibleColumns.repeatedOrder && <th style={{ padding: '10px 12px' }}>Repeated Order</th>}
                  {visibleColumns.additionalNote && <th style={{ padding: '10px 12px' }}>Additional Note</th>}
                  {visibleColumns.logoName && <th style={{ padding: '10px 12px' }}>Logo Name</th>}
                  {visibleColumns.pricePerPiece && <th style={{ padding: '10px 12px' }}>Price Per Piece</th>}
                  {visibleColumns.totalAmount && <th style={{ padding: '10px 12px' }}>Total Amount</th>}
                  {visibleColumns.gst && <th style={{ padding: '10px 12px' }}>GST (%)</th>}
                  {visibleColumns.netAmount && <th style={{ padding: '10px 12px' }}>Net Amount</th>}
                  {visibleColumns.advanceAmount && <th style={{ padding: '10px 12px' }}>Advance Amount</th>}
                  {visibleColumns.pendingAmount && <th style={{ padding: '10px 12px' }}>Pending Amount</th>}
                  {visibleColumns.urgency && <th style={{ padding: '10px 12px' }}>Urgency</th>}
                  {visibleColumns.deliveryDate && <th style={{ padding: '10px 12px' }}>Delivery Date</th>}
                  {visibleColumns.modeOfDelivery && <th style={{ padding: '10px 12px' }}>Mode of Delivery</th>}
                  {visibleColumns.items && <th style={{ padding: '10px 12px' }}>Add Items</th>}
                  {visibleColumns.action && <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {matchingLeads.map((item, itemIdx) => {
                  const stageInfo = getLeadStageInfo(item, currentStage, currentSubStage);
                  return (
                    <tr
                      key={item._id || item.orderId || `order-row-${itemIdx}`}
                      id={`order-row-${item.orderId || item._id}`}
                      onClick={() => {
                        navigate(`/order/create-lead?id=${item._id}&from=${encodeURIComponent(location.pathname)}&stage=${encodeURIComponent(item.orderStage || 'sample')}`);
                      }}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      title="Click to open order lead"
                    >
                      {visibleColumns.orderId && (
                        <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>
                          {item.orderId || (item._id ? `ORD-${String(item._id).slice(-5).toUpperCase()}` : '—')}
                        </td>
                      )}
                      {visibleColumns.companyName && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.companyName || '—'}
                        </td>
                      )}
                      {visibleColumns.employeeName && (
                        <td style={{ padding: '12px', color: '#64748b' }}>
                          {item.employeeName || 'Sales Executive'}
                        </td>
                      )}
                      {visibleColumns.phoneNumber && (
                        <td style={{ padding: '12px', color: '#64748b' }}>
                          {item.phoneNumber || '—'}
                        </td>
                      )}
                      {visibleColumns.orderStage && (
                        <td style={{ padding: '12px' }}>
                          <span style={{ color: '#334155', textTransform: 'capitalize', fontSize: '13px' }}>
                            {(item.query || '').toLowerCase() === 'lead' ? 'Lead' : (item.orderStage || 'Sample')}
                          </span>
                        </td>
                      )}
                      {visibleColumns.subStage && (
                        <td style={{ padding: '12px' }}>
                          <span style={{ color: '#334155', textTransform: 'capitalize', fontSize: '13px' }}>
                            {(item.subStage === 'new' || (item.query || '').toLowerCase() === 'lead' ? 'Leads' : (item.subStage || 'Order')).replace(/-/g, ' ')}
                          </span>
                        </td>
                      )}
                      {visibleColumns.stageStatus && (
                        <td style={{ padding: '12px' }}>
                          <span style={{ color: stageInfo.status === 'approved' ? '#059669' : '#b45309', fontWeight: 600, fontSize: '13px' }}>
                            {stageInfo.status === 'approved' ? 'Approved & Advanced' : 'In Progress'}
                          </span>
                        </td>
                      )}
                      {currentSubStage === 'printing' && visibleColumns.printingStatus && (
                        <td style={{ padding: '12px' }}>
                          <span style={{ color: '#334155', fontSize: '13px' }}>
                            {item.printingStageData?.printingStatus || 'Work in Progress'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.totalQuantity && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.totalQuantity ? `${item.totalQuantity} pcs` : '—'}
                        </td>
                      )}
                      {visibleColumns.clearanceStatus && (
                        <td style={{ padding: '12px' }}>
                          <span style={{ color: (item.leadApproval?.status || item.approvalStatus) === 'Approved' ? '#059669' : (item.leadApproval?.status || item.approvalStatus) === 'Referred Back' ? '#dc2626' : '#d97706', fontWeight: 600, fontSize: '13px' }}>
                            {(item.leadApproval?.status || item.approvalStatus) === 'Approved'
                              ? 'Approved'
                              : (item.leadApproval?.status || item.approvalStatus) === 'Referred Back'
                              ? 'Referred Back'
                              : 'Pending'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.createdAt && (
                        <td style={{ padding: '12px', color: '#94a3b8', fontSize: '12px' }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                        </td>
                      )}
                      {visibleColumns.query && (
                        <td style={{ padding: '12px', color: '#475569', textTransform: 'capitalize' }}>
                          {item.query || 'lead'}
                        </td>
                      )}
                      {visibleColumns.clientName && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.clientName || '—'}
                        </td>
                      )}
                      {visibleColumns.companyAddress && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.companyAddress || '—'}
                        </td>
                      )}
                      {visibleColumns.state && (
                        <td style={{ padding: '12px', color: '#475569', textTransform: 'uppercase' }}>
                          {item.state ? String(item.state).toUpperCase() : '—'}
                        </td>
                      )}
                      {visibleColumns.pincode && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.pincode || '—'}
                        </td>
                      )}
                      {visibleColumns.repeatedOrder && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.repeatedOrder || 'No'}
                        </td>
                      )}
                      {visibleColumns.additionalNote && (
                        <td style={{ padding: '12px', color: '#475569', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.additionalNote || '—'}
                        </td>
                      )}
                      {visibleColumns.logoName && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.logoName || '—'}
                        </td>
                      )}
                      {visibleColumns.pricePerPiece && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.pricePerPiece ? `₹${item.pricePerPiece}` : '—'}
                        </td>
                      )}
                      {visibleColumns.totalAmount && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.totalAmount ? `₹${item.totalAmount}` : '—'}
                        </td>
                      )}
                      {visibleColumns.gst && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.gst ? `${item.gst}%` : '—'}
                        </td>
                      )}
                      {visibleColumns.netAmount && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.netAmount ? `₹${item.netAmount}` : '—'}
                        </td>
                      )}
                      {visibleColumns.advanceAmount && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.advanceAmount ? `₹${item.advanceAmount}` : '—'}
                        </td>
                      )}
                      {visibleColumns.pendingAmount && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.pendingAmount !== undefined && item.pendingAmount !== '' ? `₹${item.pendingAmount}` : '—'}
                        </td>
                      )}
                      {visibleColumns.urgency && (
                        <td style={{ padding: '12px', color: '#475569', textTransform: 'capitalize' }}>
                          {item.urgency || '—'}
                        </td>
                      )}
                      {visibleColumns.deliveryDate && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {item.deliveryDate ? (item.deliveryDate.includes('T') ? item.deliveryDate.split('T')[0] : item.deliveryDate) : '—'}
                        </td>
                      )}
                      {visibleColumns.modeOfDelivery && (
                        <td style={{ padding: '12px', color: '#475569', textTransform: 'capitalize' }}>
                          {item.modeOfDelivery || '—'}
                        </td>
                      )}
                      {visibleColumns.items && (
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {Array.isArray(item.items) && item.items.length > 0
                            ? item.items.map((it) => `${it.item || it.enterItem || 'Item'} (${it.quantity || 0})`).join(', ')
                            : '—'}
                        </td>
                      )}
                      {visibleColumns.action && (
                        <td style={{ padding: '12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              const editParam = isLeadManager ? 'false' : 'true';
                              navigate(`/order/create-lead?id=${item._id}&edit=${editParam}&from=${encodeURIComponent(location.pathname)}&stage=${encodeURIComponent(item.orderStage || 'sample')}`);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                            title={isLeadManager ? "View this order" : "Edit this order"}
                          >
                            {isLeadManager ? <Eye size={13} /> : <Edit2 size={13} />}
                            <span>{isLeadManager ? 'View' : 'Edit'}</span>
                          </button>
                        </td>
                      )}
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

