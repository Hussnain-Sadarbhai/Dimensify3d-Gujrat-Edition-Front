import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/logo-1.png";
import "./AdminTapq.css";
import {
  GST_STATES,
  TERMS_DATA,
  INITIAL_FORM_DATA,
  INITIAL_GST_RATES,
  pad,
  todayStr,
  numToWords,
  isFormValid,
  getMissingFields,
  getGstInfo,
  calculateTotals,
  generateQR,
  getSignatureDataURL,
  generatePDF,
} from "./AdminTapqPdf";
import API_BASE_URL from "./apiConfig";

// ── INVOICE NUMBER SEQUENCE ────────────────────────────────────────────────
// Backend now does all the work (reading the counters node + formatting).
// We just call the lightweight endpoint and use what it gives us.
const FALLBACK_NEXT_INVOICE_NUMBERS = {
  "TAX INVOICE": "D3D-T-A364",
  "QUOTATION": "D3D-Q-A364",
  "PROFORMA INVOICE": "D3D-P-A364",
  "ADVANCE PAYMENT RECEIPT": "D3D-A-A364",
};

// Fetches the next invoice number for every document type in one go.
// Returns an object like:
// { "TAX INVOICE": "D3D-T-A365", "QUOTATION": "D3D-Q-A364", ... }
async function fetchNextInvoiceNumbers() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/tapq/next-invoice-numbers`,
    );
    const data = await response.json();

    if (!response.ok || !data.success || !data.data?.nextNumbers) {
      // API failed — fall back to safe defaults so the form still works.
      return { ...FALLBACK_NEXT_INVOICE_NUMBERS };
    }

    return data.data.nextNumbers;
  } catch (err) {
    console.error("Failed to fetch next invoice numbers:", err);
    return { ...FALLBACK_NEXT_INVOICE_NUMBERS };
  }
}

// Converts a docType constant like "ADVANCE PAYMENT RECEIPT" into a
// human-friendly label like "Advance Payment Receipt" for use in the
// Invoice Number field's dynamic label.
function formatDocTypeLabel(docType) {
  if (!docType) return "Invoice";
  return docType
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function NumInput({
  value,
  onChange,
  placeholder,
  className,
  style,
  min,
  step,
}) {
  const handleWheel = (e) => e.target.blur();
  const displayVal = value === 0 || value === "0" || value === "" ? "" : value;
  return (
    <input
      type="number"
      className={className}
      style={style}
      placeholder={placeholder || "0"}
      value={displayVal}
      min={min}
      step={step}
      onWheel={handleWheel}
      onChange={onChange}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
      }}
    />
  );
}

export default function AdminTapq() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
  const [items, setItems] = useState([]);
  const [gstRates, setGstRates] = useState({ ...INITIAL_GST_RATES });
  const [dueDate, setDueDate] = useState("");
  const [itemIdCounter, setItemIdCounter] = useState(3);

  const [showAdvanceSection, setShowAdvanceSection] = useState(false);
  const [advanceEntries, setAdvanceEntries] = useState([]);
  const [advanceEntryCounter, setAdvanceEntryCounter] = useState(1);

  // ── save state ─────────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const [saveError, setSaveError] = useState(null);

  // ── invoice number sequence state ─────────────────────────────────────
  // Cache of next-available numbers per doc type, fetched from the backend.
  const [nextInvoiceNumbers, setNextInvoiceNumbers] = useState(null);
  const [invoiceNumLoading, setInvoiceNumLoading] = useState(false);
  // Tracks whether the current invoiceNum value in formData was set by us
  // (auto-fill) rather than typed by the user — so switching docType
  // doesn't clobber a manual edit.
  const wasAutoFilledRef = useRef(true);

  const qrCanvasRef = useRef(null);

  const computeDefaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    const p = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate())
    );
  };

  useEffect(() => {
    setDueDate(computeDefaultDueDate());
  }, []);

  // Loads the next-invoice-number map from the backend and applies the
  // value for the currently selected docType into the form (only if the
  // user hasn't manually overridden the field).
  const loadAndApplyInvoiceNumbers = async (docTypeToApply) => {
    setInvoiceNumLoading(true);
    try {
      const map = await fetchNextInvoiceNumbers();
      setNextInvoiceNumbers(map);
      const targetDocType = docTypeToApply || formData.docType;
      const nextNum = map[targetDocType];
      if (nextNum) {
        setFormData((prev) => ({ ...prev, invoiceNum: nextNum }));
        wasAutoFilledRef.current = true;
      }
    } finally {
      setInvoiceNumLoading(false);
    }
  };

  // Fetch sequence numbers once on mount and auto-fill the field for the
  // initially selected document type.
  useEffect(() => {
    loadAndApplyInvoiceNumbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── REFRESH ALL FIELDS ────────────────────────────────────────────────────
  const handleRefresh = (skipInvoiceFetch = false) => {
    setFormData({ ...INITIAL_FORM_DATA });
    setItems([]);
    setGstRates({ ...INITIAL_GST_RATES });
    setDueDate(computeDefaultDueDate());
    setItemIdCounter(3);
    setShowAdvanceSection(false);
    setAdvanceEntries([]);
    setAdvanceEntryCounter(1);
    setSaveStatus("idle");
    setSaveError(null);
    wasAutoFilledRef.current = true;
    if (!skipInvoiceFetch) {
      // Re-fetch so the next invoice number reflects the document we just
      // saved (its number is now the new max).
      loadAndApplyInvoiceNumbers(INITIAL_FORM_DATA.docType);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "custAddress") {
      const singleLine = value.replace(/[\r\n]+/g, " ");
      setFormData((prev) => ({ ...prev, [name]: singleLine }));
      return;
    }

    if (name === "invoiceNum") {
      // User is manually editing the invoice number — stop auto-filling
      // over it until the doc type changes again or fields are refreshed.
      wasAutoFilledRef.current = false;
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    if (name === "docType") {
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Only auto-swap the invoice number if the current value was itself
      // auto-filled (i.e. the user hasn't manually typed a custom one).
      if (wasAutoFilledRef.current) {
        const nextNum = nextInvoiceNumbers?.[value];
        if (nextNum) {
          setFormData((prev) => ({ ...prev, invoiceNum: nextNum }));
        } else {
          // We don't have a cached number for this type yet — fetch fresh.
          loadAndApplyInvoiceNumbers(value);
        }
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGstRateChange = (e) => {
    const { name, value } = e.target;
    setGstRates((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleAddItem = () => {
    const newId = itemIdCounter;
    setItems((prev) => [
      ...prev,
      { id: newId, desc: "", hsn: "", qty: 1, price: "" },
    ]);
    setItemIdCounter(newId + 1);
  };

  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "qty" || field === "price"
                  ? value === ""
                    ? ""
                    : parseFloat(value) || 0
                  : value,
            }
          : item,
      ),
    );
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // ── ADVANCE PAYMENT HANDLERS ──────────────────────────────────────────────

  const handleOpenAdvanceSection = () => {
    setShowAdvanceSection(true);
    const newId = advanceEntryCounter;
    setAdvanceEntries([{ id: newId, advId: "", amount: "", applied: false }]);
    setAdvanceEntryCounter(newId + 1);
  };

  const handleCloseAdvanceSection = () => {
    setShowAdvanceSection(false);
    setAdvanceEntries([]);
  };

  const handleAdvanceEntryChange = (id, field, value) => {
    setAdvanceEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  const handleApplyAdvanceEntry = (id) => {
    setAdvanceEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, applied: true } : e)),
    );
  };

  const handleAddAnotherAdvance = () => {
    const newId = advanceEntryCounter;
    setAdvanceEntries((prev) => [
      ...prev,
      { id: newId, advId: "", amount: "", applied: false },
    ]);
    setAdvanceEntryCounter(newId + 1);
  };

  const handleRemoveAdvanceEntry = (id) => {
    setAdvanceEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      if (updated.length === 0) {
        setShowAdvanceSection(false);
      }
      return updated;
    });
  };

  const handleEditAdvanceEntry = (id) => {
    setAdvanceEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, applied: false } : e)),
    );
  };

  // ── TOTALS ────────────────────────────────────────────────────────────────

  const {
    taxable,
    gstTotal,
    total,
    gst,
    totalAdvance,
    balancePayable,
    appliedAdvances,
  } = calculateTotals(items, formData.gstType, gstRates, advanceEntries);

  const allApplied =
    advanceEntries.length > 0 && advanceEntries.every((e) => e.applied);

  const formValid = isFormValid(formData, items);
  const missingFields = getMissingFields(formData, items);

  // ── SAVE TO FIREBASE API ──────────────────────────────────────────────────
  const saveDocumentToFirebase = async () => {
    const payload = {
      // Customer Details
      custName: formData.custName,
      custPhone: formData.custPhone,
      custAddress: formData.custAddress,
      custEmail: formData.custEmail,
      custState: formData.custState,

      // Invoice Details
      invoiceNum: formData.invoiceNum,
      docType: formData.docType,
      gstType: formData.gstType,
      invoiceDate: todayStr(),
      dueDate: dueDate,

      // GST Rates
      gstRates: {
        igstRate: gstRates.igstRate,
        cgstRate: gstRates.cgstRate,
        sgstRate: gstRates.sgstRate,
      },

      // Items (strip internal React id, only send what backend needs)
      items: items.map((item) => ({
        desc: item.desc,
        hsn: item.hsn,
        qty: item.qty,
        price: item.price,
      })),

      // Calculated totals
      taxable,
      gstTotal,
      total,
      totalAdvance,
      balancePayable,

      // Advance payments
      appliedAdvances: appliedAdvances.map((adv) => ({
        advId: adv.advId,
        amount: adv.amount,
      })),
    };

    const response = await fetch(`${API_BASE_URL}/api/tapq/save-document`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to save document");
    }

    return data;
  };

const handleGeneratePDF = async () => {
  if (!formValid) return;

  setSaveStatus("saving");
  setSaveError(null);

  try {
    const [qrData, sigImg, saveResult] = await Promise.all([
      generateQR(
        "upi://pay?pa=9483914542@kotak811&pn=MohammedAdilBetageri&am=" +
          (totalAdvance > 0 ? balancePayable : total).toFixed(2) +
          "&cu=INR",
        qrCanvasRef
      ),
      getSignatureDataURL(),
      saveDocumentToFirebase(),
    ]);

    console.log("Document saved:", saveResult.data?.documentId);

    await generatePDF({
      formData,
      items,
      gstRates,
      dueDate,
      totalAdvance,
      balancePayable,
      total,
      taxable,
      gstTotal,
      qrData,
      sigImg,
      appliedAdvances,
    });

    setSaveStatus("saved");
    setTimeout(() => {
      setSaveStatus("idle");
      handleRefresh(); // ← clears all inputs after success, re-fetches next invoice number
    }, 4000);

  } catch (error) {
    console.error("Error during PDF generation or save:", error);
    setSaveError(error.message || "Something went wrong");
    setSaveStatus("error");

    try {
      const [qrData, sigImg] = await Promise.all([
        generateQR(
          "upi://pay?pa=9483914542@kotak811&pn=MohammedAdilBetageri&am=" +
            (totalAdvance > 0 ? balancePayable : total).toFixed(2) +
            "&cu=INR",
          qrCanvasRef
        ),
        getSignatureDataURL(),
      ]);

      await generatePDF({
        formData,
        items,
        gstRates,
        dueDate,
        totalAdvance,
        balancePayable,
        total,
        taxable,
        gstTotal,
        qrData,
        sigImg,
        appliedAdvances,
      });

      // PDF downloaded despite save failure — still refresh
      setTimeout(() => {
        setSaveStatus("idle");
        setSaveError(null);
        handleRefresh(); // ← clears all inputs after PDF download
      }, 4000);

    } catch (pdfError) {
      console.error("PDF generation also failed:", pdfError);
      // Don't refresh if PDF itself failed — user may want to retry
    }
  }
};

  // ── BUTTON LABEL & STYLE HELPERS ──────────────────────────────────────────
  const getButtonLabel = () => {
    if (!formValid) return "🔒 Fill Required Fields to Generate PDF";
    if (saveStatus === "saving") return "⏳ Saving & Generating PDF...";
    if (saveStatus === "saved") return "✅ Saved & PDF Downloaded!";
    if (saveStatus === "error") return "⚠ Save Failed — PDF Downloaded";
    return "⬇ Generate Invoice PDF";
  };

  const getButtonClass = () => {
    let cls = "tapq-btn-generate";
    if (!formValid) cls += " tapq-btn-generate--disabled";
    if (saveStatus === "saving") cls += " tapq-btn-generate--saving";
    if (saveStatus === "saved") cls += " tapq-btn-generate--saved";
    if (saveStatus === "error") cls += " tapq-btn-generate--error";
    return cls;
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="tapq-admin">
      <header className="tapq-header">
        <img src={logo} alt="Dimensify3D Logo" className="tapq-logo-img" />
        <div>
          <h1>DIMENSIFY3D — TAPQ</h1>
          <p>Create TAPQ docs</p>
        </div>
        <div className="tapq-header-actions">
          <button
            className="tapq-btn-view-docs"
            onClick={() => navigate("/tapqdocs")}
            title="View previously generated documents"
          >
            📄 View Previous Docs
          </button>
          <button
            className="tapq-btn-refresh"
            onClick={() => handleRefresh(false)}
            title="Clear all fields and start fresh"
          >
            Refresh Fields
          </button>
        </div>
      </header>

      <div className="tapq-container">
        {/* Customer Details */}
        <div className="tapq-card">
          <h2>Customer Details</h2>
          <div className="tapq-form-grid">
            <div className="tapq-form-group">
              <label>Customer Name *</label>
              <input
                type="text"
                name="custName"
                value={formData.custName}
                onChange={handleFormChange}
                placeholder="e.g. Rameez Raja Sikandar"
              />
            </div>
            <div className="tapq-form-group">
              <label>Phone *</label>
              <input
                type="text"
                name="custPhone"
                value={formData.custPhone}
                onChange={handleFormChange}
                placeholder="e.g. 77094 45566"
              />
            </div>
            <div className="tapq-form-group tapq-span2">
              <label>Address *</label>
              <input
                type="text"
                name="custAddress"
                value={formData.custAddress}
                onChange={handleFormChange}
                placeholder="House No, Street, City, District, State - PIN"
                className="tapq-address-input"
              />
            </div>
            <div className="tapq-form-group">
              <label>Email</label>
              <input
                type="text"
                name="custEmail"
                value={formData.custEmail}
                onChange={handleFormChange}
                placeholder="NA or email@example.com"
              />
            </div>
            <div className="tapq-form-group">
              <label>State Name &amp; Code</label>
              <select
                name="custState"
                value={formData.custState}
                onChange={handleFormChange}
              >
                {GST_STATES.map(([name, code]) => (
                  <option key={code} value={`${name}, Code : ${code}`}>
                    {name} (Code : {code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="tapq-card">
          <h2>Invoice Details</h2>
          <div className="tapq-form-grid">
            <div className="tapq-form-group">
              <label>
                {formatDocTypeLabel(formData.docType)} Number *{" "}
                {invoiceNumLoading && (
                  <span className="tapq-inv-loading-hint">(fetching next #...)</span>
                )}
              </label>
              <input
                type="text"
                name="invoiceNum"
                value={formData.invoiceNum}
                onChange={handleFormChange}
                placeholder="e.g. D3D-T-A364"
              />
            </div>
            <div className="tapq-form-group">
              <label>Due Date (auto: +15 days)</label>
              <input type="date" value={dueDate} readOnly />
            </div>
            <div className="tapq-form-group">
              <label>Document Type</label>
              <select
                name="docType"
                value={formData.docType}
                onChange={handleFormChange}
              >
                <option value="TAX INVOICE">Tax Invoice</option>
                <option value="QUOTATION">Quotation</option>
                <option value="PROFORMA INVOICE">Proforma Invoice</option>
                <option value="ADVANCE PAYMENT RECEIPT">
                  Advance Payment Receipt
                </option>
              </select>
            </div>
            <div className="tapq-form-group">
              <label>GST Type</label>
              <select
                name="gstType"
                value={formData.gstType}
                onChange={handleFormChange}
              >
                <option value="igst">IGST</option>
                <option value="cgst_sgst">CGST + SGST</option>
              </select>
            </div>
          </div>
          <div className="tapq-notice">
            Invoice Date is automatically set to <strong>today</strong>. Due
            Date is automatically set to <strong>15 days from today</strong>.
            Invoice Number is auto-filled with the next number in sequence
            for the selected document type — you can still edit it manually.
          </div>
        </div>

        {/* Items */}
        <div className="tapq-card">
          <h2>Items</h2>
          <div className="tapq-items-header">
            <span>Si.No</span>
            <span>Item</span>
            <span>HSN Code</span>
            <span>Qty</span>
            <span>Price/Unit</span>
            <span>GST Amt</span>
            <span>Amount</span>
            <span></span>
          </div>
          <div className="tapq-items-container">
            {items.map((item, idx) => {
              const q = parseFloat(item.qty) || 0;
              const p = parseFloat(item.price) || 0;
              const lineTaxable = q * p;
              const lineGst = (lineTaxable * gst.rate) / 100;
              const lineAmt = lineTaxable + lineGst;
              return (
                <div key={item.id} className="tapq-item-row">
                  <span className="tapq-item-sno">{idx + 1}</span>
                  <input
                    type="text"
                    placeholder="Item description"
                    value={item.desc}
                    onChange={(e) =>
                      handleItemChange(item.id, "desc", e.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="HSN"
                    value={item.hsn}
                    onChange={(e) =>
                      handleItemChange(item.id, "hsn", e.target.value)
                    }
                  />
                  <NumInput
                    placeholder="Qty"
                    value={item.qty}
                    min="1"
                    onChange={(e) =>
                      handleItemChange(item.id, "qty", e.target.value)
                    }
                  />
                  <NumInput
                    placeholder="Price"
                    value={item.price}
                    min="0"
                    step="0.01"
                    onChange={(e) =>
                      handleItemChange(item.id, "price", e.target.value)
                    }
                  />
                  <span className="tapq-calc-val">{lineGst.toFixed(2)}</span>
                  <span className="tapq-calc-val">{lineAmt.toFixed(2)}</span>
                  <button
                    className="tapq-btn-remove"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          <button className="tapq-btn-add" onClick={handleAddItem}>
            + Add Item
          </button>

          {formData.gstType === "igst" && (
            <div className="tapq-gst-row">
              <label>IGST (%)</label>
              <input
                type="number"
                name="igstRate"
                value={gstRates.igstRate}
                min="0"
                max="100"
                onWheel={(e) => e.target.blur()}
                onChange={handleGstRateChange}
              />
            </div>
          )}
          {formData.gstType === "cgst_sgst" && (
            <div className="tapq-gst-row">
              <label>CGST (%)</label>
              <input
                type="number"
                name="cgstRate"
                value={gstRates.cgstRate}
                min="0"
                max="100"
                onWheel={(e) => e.target.blur()}
                onChange={handleGstRateChange}
              />
              <label>SGST (%)</label>
              <input
                type="number"
                name="sgstRate"
                value={gstRates.sgstRate}
                min="0"
                max="100"
                onWheel={(e) => e.target.blur()}
                onChange={handleGstRateChange}
              />
            </div>
          )}

          {/* Totals + Advance Payment */}
          <div className="tapq-totals-bottom">
            {/* LEFT: Advance Payment Section */}
            <div className="tapq-advance-section">
              {!showAdvanceSection ? (
                <button
                  className="tapq-btn-advance"
                  onClick={handleOpenAdvanceSection}
                >
                  + Add Advance Payment
                </button>
              ) : (
                <div className="tapq-advance-box">
                  <div className="tapq-advance-header">
                    <span className="tapq-advance-label">Advance Payments</span>
                    <button
                      className="tapq-advance-close"
                      onClick={handleCloseAdvanceSection}
                    >
                      ×
                    </button>
                  </div>

                  <div className="tapq-advance-entries">
                    {advanceEntries.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className={`tapq-advance-entry ${entry.applied ? "tapq-advance-entry--applied" : ""}`}
                      >
                        <div className="tapq-advance-entry-label">
                          <span className="tapq-advance-entry-num">
                            #{idx + 1}
                          </span>
                          {entry.applied && entry.advId && (
                            <span className="tapq-advance-entry-id-badge">
                              {entry.advId}
                            </span>
                          )}
                        </div>

                        {entry.applied ? (
                          <div className="tapq-advance-applied-row">
                            <div className="tapq-advance-applied-info">
                              <span className="tapq-advance-applied-id">
                                {entry.advId || (
                                  <em style={{ opacity: 0.5 }}>No ID</em>
                                )}
                              </span>
                              <span className="tapq-advance-applied-amt">
                                Rs. {parseFloat(entry.amount || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="tapq-advance-applied-actions">
                              <button
                                className="tapq-btn-edit-adv"
                                onClick={() => handleEditAdvanceEntry(entry.id)}
                                title="Edit"
                              >
                                ✎
                              </button>
                              <button
                                className="tapq-btn-remove-adv"
                                onClick={() =>
                                  handleRemoveAdvanceEntry(entry.id)
                                }
                                title="Remove"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="tapq-advance-input-group">
                            <div className="tapq-advance-id-wrapper">
                              <span className="tapq-advance-id-icon">🔖</span>
                              <input
                                type="text"
                                className="tapq-advance-id-input"
                                placeholder="Payment ID (e.g. TXN123)"
                                value={entry.advId}
                                onChange={(e) =>
                                  handleAdvanceEntryChange(
                                    entry.id,
                                    "advId",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="tapq-advance-input-row">
                              <span className="tapq-advance-prefix">Rs.</span>
                              <input
                                type="number"
                                className="tapq-advance-input"
                                placeholder="0.00"
                                value={entry.amount === "" ? "" : entry.amount}
                                min="0"
                                step="0.01"
                                onWheel={(e) => e.target.blur()}
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "ArrowUp" ||
                                    e.key === "ArrowDown"
                                  )
                                    e.preventDefault();
                                }}
                                onChange={(e) =>
                                  handleAdvanceEntryChange(
                                    entry.id,
                                    "amount",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="tapq-advance-entry-actions">
                              <button
                                className="tapq-btn-apply-adv"
                                disabled={
                                  !entry.amount || parseFloat(entry.amount) <= 0
                                }
                                onClick={() =>
                                  handleApplyAdvanceEntry(entry.id)
                                }
                              >
                                ✓ Apply
                              </button>
                              {advanceEntries.length > 1 && (
                                <button
                                  className="tapq-btn-remove-adv"
                                  onClick={() =>
                                    handleRemoveAdvanceEntry(entry.id)
                                  }
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {allApplied && (
                    <button
                      className="tapq-btn-add-another-adv"
                      onClick={handleAddAnotherAdvance}
                    >
                      + Add Another Payment
                    </button>
                  )}

                  {appliedAdvances.length > 1 && (
                    <div className="tapq-advance-summary">
                      <span>Total Advance</span>
                      <strong>Rs. {totalAdvance.toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Totals */}
            <div className="tapq-totals-grid">
              <div className="tapq-total-row">
                <span>Taxable Value</span>
                <span>Rs. {taxable.toFixed(2)}</span>
              </div>
              {gst.type === "igst" ? (
                <div className="tapq-total-row">
                  <span>IGST @ {gst.rate}%</span>
                  <span>Rs. {gstTotal.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="tapq-total-row">
                    <span>CGST @ {gst.cgst}%</span>
                    <span>Rs. {((taxable * gst.cgst) / 100).toFixed(2)}</span>
                  </div>
                  <div className="tapq-total-row">
                    <span>SGST @ {gst.sgst}%</span>
                    <span>Rs. {((taxable * gst.sgst) / 100).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="tapq-total-row tapq-grand">
                <span>Total Amount</span>
                <span>Rs. {total.toFixed(2)}</span>
              </div>

              {appliedAdvances.map((adv, idx) => (
                <div key={adv.id} className="tapq-total-row tapq-advance-row">
                  <span>
                    {adv.advId
                      ? `Advance #${idx + 1} (${adv.advId})`
                      : `Advance #${idx + 1}`}
                  </span>
                  <span>− Rs. {parseFloat(adv.amount).toFixed(2)}</span>
                </div>
              ))}

              {appliedAdvances.length > 1 && (
                <div className="tapq-total-row tapq-advance-row tapq-advance-total-row">
                  <span>Total Advance</span>
                  <span>− Rs. {totalAdvance.toFixed(2)}</span>
                </div>
              )}

              {appliedAdvances.length > 0 && (
                <div className="tapq-total-row tapq-balance-row">
                  <span>Balance Payable</span>
                  <span>Rs. {balancePayable.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generate Button + Status */}
        <div className="tapq-generate-wrapper">
          <button
            className={getButtonClass()}
            onClick={handleGeneratePDF}
            disabled={!formValid || saveStatus === "saving"}
            title={
              !formValid
                ? "Fill all required fields to generate PDF"
                : "Generate Invoice PDF"
            }
          >
            {getButtonLabel()}
          </button>

          {/* Save error notice — PDF still downloaded, only DB save failed */}
          {saveStatus === "error" && saveError && (
            <p className="tapq-save-error">
              ⚠ Could not save to database: {saveError}. Your PDF was still
              downloaded.
            </p>
          )}

          {/* Success notice */}
          {saveStatus === "saved" && (
            <p className="tapq-save-success">
              ✅ Document saved to database successfully.
            </p>
          )}
        </div>
      </div>

      <div
        id="tapq-qr-hidden"
        ref={qrCanvasRef}
        style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
      ></div>
    </div>
  );
}