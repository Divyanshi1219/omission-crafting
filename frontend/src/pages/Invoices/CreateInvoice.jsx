import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Download,
  Printer,
  Send,
  Save,
  CheckCircle2,
  Upload,
  Hash,
  User,
  Building,
  DollarSign,
  ChevronDown,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  Percent,
  FileCheck,
  AlertCircle
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logoImg from "../../assets/logo.png";
import api from "../../api";
import { numberToWords } from "../../utils/numberToWords";
import "./CreateInvoice.css";

const STORAGE_KEY = "omission_local_invoices";

const THEME_COLORS = [
  { name: "Crimson Red", hex: "#dc2626" },
  { name: "Navy Blue", hex: "#1e3a8a" },
  { name: "Emerald Green", hex: "#059669" },
  { name: "Royal Purple", hex: "#7c3aed" },
  { name: "Warm Orange", hex: "#ea580c" },
  { name: "Sky Blue", hex: "#0284c7" },
  { name: "Berry Rose", hex: "#be185d" },
];

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "India (₹)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "GBP", symbol: "£", label: "UK Pound (£)" },
];

const UNITS = ["Pcs", "Box", "Sets", "Mtr", "Kg", "Units"];

function CreateInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");

  const previewRef = useRef(null);

  // Layout View States
  const [showPreview, setShowPreview] = useState(true);
  const [invoiceType, setInvoiceType] = useState("Standard"); // 'Standard' | 'Split' | 'Recurring'

  // Leads for autofill
  const [leadsList, setLeadsList] = useState([]);

  // Form Fields (Aligned with Screenshot 2 & Vyapar 3, 4, 5)
  const [themeColor, setThemeColor] = useState("#be185d");
  const [currency, setCurrency] = useState("INR");
  const [customLogo, setCustomLogo] = useState(null);

  // Company Details (Screenshot 3)
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyGstin, setCompanyGstin] = useState("");
  const [billedBy, setBilledBy] = useState("");

  // Invoice Info (Screenshot 2 & 3)
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Bill To / Customer Details (Screenshot 2, 3, 4)
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Invoice Items (Screenshot 2 & 4)
  const [items, setItems] = useState([
    {
      id: 1,
      itemName: "",
      quantity: "",
      unit: "Pcs",
      rate: "",
      amount: 0,
    },
  ]);

  // Tax / GST (Screenshot 4)
  const [includeTax, setIncludeTax] = useState(false);
  const [taxRate, setTaxRate] = useState(18); // Available GST % options

  // Discount (Screenshot 2)
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountType, setDiscountType] = useState("flat"); // 'flat' | 'percentage'
  const [discountValue, setDiscountValue] = useState("");

  // Terms & Payment Details (Screenshot 4)
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");

  // Save / Action UI State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [status, setStatus] = useState("Sent");

  // Load existing leads to provide autofill option
  useEffect(() => {
    api.get("/api/leads")
      .then((res) => {
        if (res.data?.data) {
          setLeadsList(res.data.data);
        }
      })
      .catch((err) => console.log("Leads fetch notice:", err.message));
  }, []);

  // Fetch or generate next invoice number
  useEffect(() => {
    if (editId) {
      // Load invoice from backend or cache
      api.get(`/api/invoices/${editId}`)
        .then((res) => {
          if (res.data?.data) {
            populateInvoiceData(res.data.data);
          }
        })
        .catch(() => {
          try {
            const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            const found = cached.find((i) => (i._id || i.id) === editId);
            if (found) populateInvoiceData(found);
          } catch (_) {}
        });
    } else {
      fetchNextInvoiceNumber();
    }
  }, [editId]);

  const fetchNextInvoiceNumber = async () => {
    const yr = new Date().getFullYear();
    const regex = new RegExp(`^INV-${yr}-(\\d+)$`, "i");

    let localMax = 0;
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(cached)) {
        cached.forEach((inv) => {
          if (inv.invoiceNumber) {
            const match = String(inv.invoiceNumber).match(regex);
            if (match) {
              const n = parseInt(match[1], 10);
              if (!isNaN(n) && n > localMax) localMax = n;
            }
          }
        });
      }
    } catch (_) {}

    try {
      const res = await api.get("/api/invoices/next-number");
      if (res.data?.nextInvoiceNumber) {
        const match = String(res.data.nextInvoiceNumber).match(regex);
        const serverNum = match ? parseInt(match[1], 10) : 0;
        const maxSeq = Math.max(localMax, serverNum - 1);
        const uniqueNext = `INV-${yr}-${String(maxSeq + 1).padStart(3, "0")}`;
        setInvoiceNumber(uniqueNext);
        return;
      }
    } catch (_) {}

    const uniqueNext = `INV-${yr}-${String(localMax + 1).padStart(3, "0")}`;
    setInvoiceNumber(uniqueNext);
  };

  const populateInvoiceData = (inv) => {
    if (inv.invoiceNumber) setInvoiceNumber(inv.invoiceNumber);
    if (inv.companyName) setCompanyName(inv.companyName);
    if (inv.companyAddress) setCompanyAddress(inv.companyAddress);
    if (inv.companyGstin) setCompanyGstin(inv.companyGstin);
    if (inv.themeColor) setThemeColor(inv.themeColor);
    if (inv.currency) setCurrency(inv.currency);
    if (inv.invoiceDate) setInvoiceDate(inv.invoiceDate);
    if (inv.dueDate) setDueDate(inv.dueDate);
    if (inv.customerName) setCustomerName(inv.customerName);
    if (inv.customerAddress) setCustomerAddress(inv.customerAddress);
    if (inv.customerGstin) setCustomerGstin(inv.customerGstin);
    if (inv.customerPhone) setCustomerPhone(inv.customerPhone);
    if (inv.items && inv.items.length) setItems(inv.items);
    if (inv.includeTax !== undefined) setIncludeTax(inv.includeTax);
    if (inv.taxRate !== undefined) setTaxRate(inv.taxRate);
    if (inv.discountValue) {
      setHasDiscount(true);
      setDiscountValue(inv.discountValue);
      setDiscountType(inv.discountType || "flat");
    }
    if (inv.termsAndConditions) setTermsAndConditions(inv.termsAndConditions);
    if (inv.status) setStatus(inv.status);
  };

  // Handle Logo Upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCustomLogo(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Autofill from existing lead
  const handleSelectLead = (leadId) => {
    const lead = leadsList.find((l) => (l._id || l.id) === leadId);
    if (lead) {
      setCustomerName(lead.clientName || lead.companyName || "");
      setCustomerAddress(
        [lead.companyAddress, lead.state, lead.pincode].filter(Boolean).join(", ")
      );
      if (lead.phoneNumber) setCustomerPhone(lead.phoneNumber);
      if (lead.email) setCustomerEmail(lead.email);
      if (lead.gstin) setCustomerGstin(lead.gstin);
    }
  };

  // Item Table handlers
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };
      if (field === "quantity" || field === "rate") {
        const q = field === "quantity" ? (value === "" ? "" : Number(value) || 0) : (target.quantity === "" ? "" : Number(target.quantity) || 0);
        const r = field === "rate" ? (value === "" ? "" : Number(value) || 0) : (target.rate === "" ? "" : Number(target.rate) || 0);
        target.amount = Math.round((Number(q) || 0) * (Number(r) || 0) * 100) / 100;
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        itemName: "",
        quantity: "",
        unit: "Pcs",
        rate: "",
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  let discountAmount = 0;
  if (hasDiscount) {
    if (discountType === "percentage") {
      discountAmount = Math.round((subtotal * (Number(discountValue) || 0)) / 100);
    } else {
      discountAmount = Number(discountValue) || 0;
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = includeTax ? Math.round((taxableAmount * (Number(taxRate) || 0)) / 100) : 0;
  const grandTotal = taxableAmount + taxAmount;

  // Selected Currency Symbol
  const currObj = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
  const currSymbol = currObj.symbol;

  // Amount in words
  const wordsRepresentation = numberToWords(grandTotal, currency);

  // Save Invoice (to backend + local cache)
  const handleSaveInvoice = async (invoiceStatus = "Sent") => {
    if (!customerName.trim()) {
      alert("Please specify a customer name before saving the invoice.");
      return;
    }

    setIsSaving(true);
    setStatus(invoiceStatus);

    const payload = {
      invoiceNumber: invoiceNumber || `INV-${new Date().getFullYear()}-001`,
      companyName,
      companyAddress,
      companyGstin,
      companyLogo: customLogo || "",
      themeColor,
      currency,
      invoiceDate,
      dueDate,
      customerName,
      customerAddress,
      customerGstin,
      customerPhone,
      customerEmail,
      items,
      includeTax,
      taxRate: Number(taxRate) || 0,
      taxAmount,
      subtotal,
      discountType,
      discountValue: Number(discountValue) || 0,
      discountAmount,
      grandTotal,
      amountInWords: wordsRepresentation,
      termsAndConditions,
      paymentDetails: {
        bankName,
        accountNumber,
        ifsc: ifscCode,
        upiId,
      },
      status: invoiceStatus,
      createdBy: billedBy,
    };

    let savedRecord = null;
    try {
      if (editId) {
        const res = await api.put(`/api/invoices/${editId}`, payload);
        if (res.data?.data) savedRecord = res.data.data;
      } else {
        const res = await api.post("/api/invoices", payload);
        if (res.data?.data) savedRecord = res.data.data;
      }
    } catch (err) {
      console.warn("Backend save failed, syncing to local storage cache:", err.message);
    }

    // Always update local cache
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const recordToPersist = savedRecord
        ? { ...payload, ...savedRecord, id: savedRecord._id || ("loc_" + Date.now()) }
        : { ...payload, id: "loc_" + Date.now() };

      let updated;
      if (editId) {
        updated = existing.map((inv) =>
          (inv._id || inv.id) === editId ? recordToPersist : inv
        );
      } else {
        updated = [recordToPersist, ...existing];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      navigate("/invoices");
    }, 1200);
  };

  // Download high-resolution PDF
  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoiceNumber || "Invoice"}_${customerName || "Client"}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      window.print();
    }
  };

  // Native Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="create-invoice-page">
      {/* Top Breadcrumb & Header Row (Screenshot 2) */}
      <div className="create-inv-header-row">
        <div>
          <div className="create-inv-breadcrumb">
            <span onClick={() => navigate("/invoices")} className="crumb-link">
              Invoice
            </span>
            <span className="crumb-sep">&gt;</span>
            <span className="crumb-active">Create Invoice</span>
          </div>
          <h1 className="create-inv-title">Create Invoice</h1>
          <p className="create-inv-subtitle">
            Create a new invoice and deliver it instantly.
          </p>
        </div>

        {/* Toggle Live Preview switch (Screenshot 2) */}
        <div className="preview-toggle-wrap">
          <span className="preview-toggle-label">Show Preview</span>
          <button
            type="button"
            className={`toggle-switch-btn ${showPreview ? "active" : ""}`}
            onClick={() => setShowPreview(!showPreview)}
            aria-label="Toggle Preview"
          >
            <span className="toggle-switch-thumb"></span>
          </button>
        </div>
      </div>

      {/* Mode Pills: Standard, Split, Recurring (Screenshot 2) */}
      <div className="invoice-mode-pills">
        {["Standard", "Split", "Recurring"].map((type) => (
          <button
            key={type}
            className={`mode-pill ${invoiceType === type ? "active" : ""}`}
            onClick={() => setInvoiceType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Main Split Grid (Screenshot 2 Layout) */}
      <div className={`create-inv-split-layout ${!showPreview ? "full-form" : ""}`}>
        {/* LEFT COLUMN: Input Form */}
        <div className="create-inv-form-col">
          {/* Section: Company & Theme Customization (Screenshot 3) */}
          <div className="form-card-section">
            <div className="form-section-title">
              <Sparkles size={16} />
              <span>Company & Invoice Theme</span>
            </div>

            <div className="company-logo-theme-row">
              {/* Logo Upload Box */}
              <div className="logo-upload-container">
                <label className="field-mini-label">Company Logo</label>
                <div className="logo-upload-box">
                  <img
                    src={customLogo || logoImg}
                    alt="Company Emblem"
                    className="uploaded-logo-preview"
                  />
                  <label className="logo-picker-btn">
                    <Upload size={13} />
                    <span>Change Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>

              {/* Theme Color Selector Dots (Screenshot 3) */}
              <div className="theme-colors-container">
                <label className="field-mini-label">Invoice Theme Color</label>
                <div className="theme-dots-palette">
                  {THEME_COLORS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      className={`theme-dot ${themeColor === col.hex ? "selected" : ""}`}
                      style={{ backgroundColor: col.hex }}
                      title={col.name}
                      onClick={() => setThemeColor(col.hex)}
                    />
                  ))}
                </div>

                {/* Currency Selector (Screenshot 2 & 3) */}
                <div className="currency-selector-wrap">
                  <label className="field-mini-label">Select Currency</label>
                  <select
                    className="styled-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Company Info Inputs (Screenshot 3) */}
            <div className="form-two-col-grid">
              <div className="input-field-group">
                <label className="field-label">Company Name *</label>
                <input
                  type="text"
                  className="styled-input"
                  placeholder="Your Business Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="input-field-group">
                <label className="field-label">Company GSTIN</label>
                <input
                  type="text"
                  className="styled-input"
                  placeholder="e.g. 33AAEC01234F1Z5"
                  value={companyGstin}
                  onChange={(e) => setCompanyGstin(e.target.value)}
                />
              </div>
            </div>

            <div className="input-field-group">
              <label className="field-label">Company Address</label>
              <input
                type="text"
                className="styled-input"
                placeholder="Street, City, State, PIN"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Section: Invoice Information (Screenshot 2 & 3) */}
          <div className="form-card-section">
            <div className="form-section-title">
              <Hash size={16} />
              <span>Invoice Information</span>
            </div>

            <div className="form-two-col-grid">
              <div className="input-field-group">
                <label className="field-label">
                  Billed By (Full Name) *
                </label>
                <div className="input-with-icon">
                  <User size={15} className="field-icon" />
                  <input
                    type="text"
                    className="styled-input with-icon"
                    placeholder="Issuer Name"
                    value={billedBy}
                    onChange={(e) => setBilledBy(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <div className="field-label-row">
                  <label className="field-label">Invoice Number</label>
                  <span className="auto-gen-badge">Auto Generated</span>
                </div>
                <div className="input-with-icon">
                  <Hash size={15} className="field-icon" />
                  <input
                    type="text"
                    className="styled-input with-icon readonly-input"
                    value={invoiceNumber || "Generating..."}
                    readOnly
                    tabIndex="-1"
                    title="Invoice number is automatically generated and cannot be edited"
                  />
                </div>
              </div>
            </div>

            <div className="form-two-col-grid">
              <div className="input-field-group">
                <label className="field-label">Date Issue *</label>
                <div className="input-with-icon">
                  <CalendarIcon size={15} className="field-icon" />
                  <input
                    type="date"
                    className="styled-input with-icon"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="field-label">Due Date *</label>
                <div className="input-with-icon">
                  <CalendarIcon size={15} className="field-icon" />
                  <input
                    type="date"
                    className="styled-input with-icon"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Bill To / Customer Details (Screenshot 2, 3, 4) */}
          <div className="form-card-section">
            <div className="form-section-title-between">
              <div className="form-section-title" style={{ margin: 0 }}>
                <Building size={16} />
                <span>Bill To (Client / Customer)</span>
              </div>

              {/* Quick Autofill Helper from Existing Leads */}
              {leadsList.length > 0 && (
                <div className="lead-autofill-selector">
                  <select
                    className="styled-select-mini"
                    onChange={(e) => handleSelectLead(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Autofill from Leads
                    </option>
                    {leadsList.map((lead) => (
                      <option key={lead._id || lead.id} value={lead._id || lead.id}>
                        {lead.clientName || lead.companyName || "Lead"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="input-field-group">
              <label className="field-label">Customer / Client Name *</label>
              <div className="input-with-icon">
                <Building size={15} className="field-icon" />
                <input
                  type="text"
                  className="styled-input with-icon"
                  placeholder="e.g. Acme Corp / Rahul Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-field-group">
              <label className="field-label">Customer Address</label>
              <textarea
                className="styled-textarea"
                rows={2}
                placeholder="Street address, City, State, PIN"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>

            <div className="form-two-col-grid">
              <div className="input-field-group">
                <label className="field-label">Customer GSTIN</label>
                <input
                  type="text"
                  className="styled-input"
                  placeholder="GSTIN (Optional)"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value)}
                />
              </div>

              <div className="input-field-group">
                <label className="field-label">Phone / Email</label>
                <input
                  type="text"
                  className="styled-input"
                  placeholder="e.g. +91 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section: Invoice Items / Service (Screenshot 2 & 4) */}
          <div className="form-card-section">
            <div className="form-section-title">
              <Layers size={16} />
              <span>Invoice Items / Service</span>
            </div>

            <div className="items-table-wrapper">
              <table className="form-items-table">
                <thead>
                  <tr>
                    <th style={{ width: "35px" }}>S.N.</th>
                    <th>ITEM NAME</th>
                    <th style={{ width: "70px" }}>QTY</th>
                    <th style={{ width: "80px" }}>UNIT</th>
                    <th style={{ width: "90px" }}>RATE ({currSymbol})</th>
                    <th style={{ width: "100px" }}>AMOUNT</th>
                    <th style={{ width: "35px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="sn-cell">{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          placeholder="Item Description"
                          value={item.itemName}
                          onChange={(e) =>
                            handleItemChange(idx, "itemName", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          placeholder="1"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(idx, "quantity", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="table-select"
                          value={item.unit}
                          onChange={(e) =>
                            handleItemChange(idx, "unit", e.target.value)
                          }
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) =>
                            handleItemChange(idx, "rate", e.target.value)
                          }
                        />
                      </td>
                      <td className="amount-cell">
                        {currSymbol}
                        {Number(item.amount || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        {items.length > 1 && (
                          <button
                            type="button"
                            className="item-delete-btn"
                            onClick={() => handleRemoveItem(idx)}
                            title="Remove Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Add Item Button (Screenshot 2 & 4) */}
              <button
                type="button"
                className="add-item-row-btn"
                onClick={handleAddItem}
              >
                <Plus size={15} />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Section: Tax / GST, Discounts & Terms (Screenshot 2 & 4) */}
          <div className="form-card-section">
            <div className="form-section-title">
              <Percent size={16} />
              <span>Tax, Discount & Notes</span>
            </div>

            {/* Does your invoice include Tax/GST? (Screenshot 4) */}
            <div className="tax-question-card">
              <label className="field-label-bold">
                Does your invoice include Tax/GST?
              </label>
              <div className="radio-options-row">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="includeTax"
                    checked={includeTax === true}
                    onChange={() => setIncludeTax(true)}
                  />
                  <span>Yes (GST Applicable)</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="includeTax"
                    checked={includeTax === false}
                    onChange={() => setIncludeTax(false)}
                  />
                  <span>No (Exempt)</span>
                </label>
              </div>

              {includeTax && (
                <div className="gst-rate-row">
                  <label className="field-mini-label">GST Tax Rate:</label>
                  <div className="gst-pills">
                    {[5, 12, 18, 28].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        className={`gst-pill ${taxRate === rate ? "active" : ""}`}
                        onClick={() => setTaxRate(rate)}
                      >
                        {rate}% GST ({(rate / 2).toFixed(1)}% CGST + {(rate / 2).toFixed(1)}% SGST)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Add Discount Checkbox (Screenshot 2) */}
            <div className="discount-toggle-block">
              <label className="custom-checkbox-row">
                <input
                  type="checkbox"
                  checked={hasDiscount}
                  onChange={(e) => setHasDiscount(e.target.checked)}
                />
                <span className="checkbox-text">Add Discount</span>
              </label>

              {hasDiscount && (
                <div className="discount-inputs-inline">
                  <select
                    className="styled-select-mini"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                  >
                    <option value="flat">Flat ({currSymbol})</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>

                  <input
                    type="number"
                    className="styled-input-mini"
                    placeholder="0"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Amount in words live box (Screenshot 4) */}
            <div className="amount-in-words-preview-box">
              <span className="words-title">INVOICE AMOUNT IN WORDS:</span>
              <p className="words-text">{wordsRepresentation}</p>
            </div>

            {/* Terms and conditions (Screenshot 4) */}
            <div className="input-field-group">
              <label className="field-label">Terms and Conditions</label>
              <textarea
                className="styled-textarea"
                rows={3}
                placeholder="Enter terms and conditions / delivery notes..."
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
              />
            </div>

            {/* Bank / Payment Details */}
            <div className="input-field-group">
              <label className="field-label">Payment Method</label>
              <input
                type="text"
                className="styled-input"
                placeholder="e.g. Bank Transfer (NEFT/RTGS), UPI, Cheque, Cash"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
            </div>

            <div className="form-two-col-grid">
              <div className="input-field-group">
                <label className="field-label">Bank Name</label>
                <input
                  type="text"
                  className="styled-input"
                  placeholder="e.g. HDFC Bank Ltd"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div className="input-field-group">
                <label className="field-label">Account Number</label>
                <input
                  type="text"
                  className="styled-input"
                  placeholder="e.g. 50200088921455"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="form-two-col-grid">
              <div className="input-field-group">
                <label className="field-label">IFSC Code</label>
                <input
                  type="text"
                  className="styled-input"
                  placeholder="e.g. HDFC0001420"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                />
              </div>

              <div className="input-field-group">
                <label className="field-label">UPI ID</label>
                <input
                  type="text"
                  className="styled-input"
                  placeholder="e.g. company@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive Preview & Action Header (Screenshot 2) */}
        {showPreview && (
          <div className="create-inv-preview-col">
            {/* Action Bar (Email, PDF, Save as Draft, Send Invoice - Screenshot 2) */}
            <div className="preview-top-action-bar">
              <h2 className="preview-bar-title">Preview</h2>

              <div className="preview-action-buttons">
                <button
                  type="button"
                  className="action-pill-btn"
                  onClick={handleDownloadPDF}
                  title="Download High-Res PDF"
                >
                  <Download size={14} />
                  <span>PDF</span>
                </button>

                <button
                  type="button"
                  className="action-pill-btn"
                  onClick={handlePrint}
                  title="Print Invoice"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  className="action-pill-btn"
                  onClick={() => handleSaveInvoice("Draft")}
                  disabled={isSaving}
                  title="Save as Draft"
                >
                  <Save size={14} />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  className="send-invoice-primary-btn"
                  onClick={() => handleSaveInvoice("Sent")}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span className="btn-spinner"></span>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Send Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* WYSIWYG Document Sheet Preview (Screenshot 2 & 4) */}
            <div className="paper-document-viewport">
              <div
                className="paper-document-sheet"
                ref={previewRef}
                id="invoice-print-area"
              >
                {/* Accent Top Bar */}
                <div
                  className="sheet-accent-top-bar"
                  style={{ backgroundColor: themeColor }}
                ></div>

                {/* Document Header */}
                <div className="doc-header-row">
                  <div>
                    <h1 className="doc-invoice-wordmark" style={{ color: themeColor }}>
                      INVOICE
                    </h1>
                    <div className="doc-invoice-number">
                      Invoice Number <strong>#{invoiceNumber || "INV-001"}</strong>
                    </div>
                  </div>

                  {/* Company Logo in Preview */}
                  <div className="doc-emblem-wrap">
                    <img
                      src={customLogo || logoImg}
                      alt="Logo"
                      className="doc-company-logo"
                    />
                  </div>
                </div>

                {/* Billed By & Billed To (2-column layout - Screenshot 2) */}
                <div className="doc-addresses-grid">
                  <div className="doc-address-col">
                    <span className="doc-section-tag">Billed by:</span>
                    <h4 className="doc-entity-name">{companyName || "Company Name"}</h4>
                    <p className="doc-address-text">{companyAddress || "Company Address"}</p>
                    {companyGstin && (
                      <p className="doc-meta-line">GSTIN: {companyGstin}</p>
                    )}
                    {billedBy && (
                      <p className="doc-meta-line">Representative: {billedBy}</p>
                    )}
                  </div>

                  <div className="doc-address-col">
                    <span className="doc-section-tag">Billed to:</span>
                    <h4 className="doc-entity-name">
                      {customerName || "Customer Name"}
                    </h4>
                    <p className="doc-address-text">
                      {customerAddress || "Customer Address Details"}
                    </p>
                    {customerGstin && (
                      <p className="doc-meta-line">GSTIN: {customerGstin}</p>
                    )}
                    {customerPhone && (
                      <p className="doc-meta-line">Contact: {customerPhone}</p>
                    )}
                  </div>
                </div>

                {/* Dates Row (Screenshot 2) */}
                <div className="doc-dates-row">
                  <div>
                    <span className="doc-date-label">Date Issue:</span>
                    <span className="doc-date-val">{invoiceDate || "-"}</span>
                  </div>
                  <div>
                    <span className="doc-date-label">Due Date:</span>
                    <span className="doc-date-val">{dueDate || "-"}</span>
                  </div>
                </div>

                {/* Items Table (Screenshot 2 & 4) */}
                <div className="doc-items-table-wrap">
                  <div className="doc-items-table-title">
                    Invoice Items/Service:
                  </div>
                  <table className="doc-items-table">
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${themeColor}` }}>
                        <th style={{ width: "30px" }}>#</th>
                        <th>Item Description</th>
                        <th style={{ textAlign: "center" }}>QTY</th>
                        <th style={{ textAlign: "center" }}>UNIT</th>
                        <th style={{ textAlign: "right" }}>RATE</th>
                        {includeTax && <th style={{ textAlign: "center" }}>TAX</th>}
                        <th style={{ textAlign: "right" }}>AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td style={{ color: "#94a3b8", fontSize: "11px" }}>
                            {idx + 1}
                          </td>
                          <td className="doc-item-name">
                            {it.itemName || "Item Description"}
                          </td>
                          <td style={{ textAlign: "center" }}>{it.quantity}</td>
                          <td style={{ textAlign: "center", color: "#64748b" }}>
                            {it.unit}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {currSymbol}
                            {Number(it.rate || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          {includeTax && (
                            <td style={{ textAlign: "center", fontSize: "11px" }}>
                              {taxRate}%
                            </td>
                          )}
                          <td style={{ textAlign: "right", fontWeight: 600 }}>
                            {currSymbol}
                            {Number(it.amount || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary (Screenshot 2 & 4) */}
                <div className="doc-financials-summary-box">
                  <div className="summary-line-row">
                    <span>Subtotal:</span>
                    <span>
                      {currSymbol}
                      {subtotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {hasDiscount && discountAmount > 0 && (
                    <div className="summary-line-row discount-line">
                      <span>Discount:</span>
                      <span>
                        -{currSymbol}
                        {discountAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}

                  {includeTax && (
                    <>
                      <div className="summary-line-row">
                        <span>CGST ({(taxRate / 2).toFixed(1)}%):</span>
                        <span>
                          {currSymbol}
                          {(taxAmount / 2).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="summary-line-row">
                        <span>SGST ({(taxRate / 2).toFixed(1)}%):</span>
                        <span>
                          {currSymbol}
                          {(taxAmount / 2).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Grand Total Banner in Theme Color (Screenshot 4) */}
                  <div
                    className="doc-grand-total-banner"
                    style={{ backgroundColor: themeColor }}
                  >
                    <span>Total Amount</span>
                    <span className="total-digits">
                      {currSymbol}
                      {grandTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* Amount in words banner (Screenshot 4) */}
                <div className="doc-words-callout">
                  <span className="doc-words-heading">
                    INVOICE AMOUNT IN WORDS:
                  </span>
                  <p className="doc-words-body">{wordsRepresentation}</p>
                </div>

                {/* Terms and Conditions (Screenshot 4) */}
                {termsAndConditions ? (
                  <div className="doc-terms-box">
                    <span className="doc-terms-heading">
                      TERMS AND CONDITIONS:
                    </span>
                    <p className="doc-terms-body">{termsAndConditions}</p>
                  </div>
                ) : null}

                {/* Footer: Payment Method & Signature (Screenshot 2) */}
                <div className="doc-footer-row">
                  <div className="doc-payment-info">
                    {paymentMethod && (
                      <>
                        <span className="doc-sublabel">Payment Method:</span>
                        <p className="doc-pay-val">{paymentMethod}</p>
                      </>
                    )}
                    {(bankName || accountNumber) && (
                      <p className="doc-pay-meta">
                        Bank: {bankName || "-"} • A/C: {accountNumber || "-"}
                      </p>
                    )}
                    {(ifscCode || upiId) && (
                      <p className="doc-pay-meta">
                        IFSC: {ifscCode || "-"} • UPI: {upiId || "-"}
                      </p>
                    )}
                  </div>

                  <div className="doc-signature-block">
                    <div className="sig-handwritten-line">
                      <span>{billedBy || "Authorized"}</span>
                    </div>
                    <div className="sig-divider-line"></div>
                    <span className="sig-author-name">Authorized Signatory</span>
                    <span className="sig-author-org">{companyName || "Organization"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateInvoice;
