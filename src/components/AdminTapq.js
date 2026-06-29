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
const FALLBACK_NEXT_INVOICE_NUMBERS = {
  "TAX INVOICE": "D3D-TA364",
  "QUOTATION": "D3D-QA364",
  "PROFORMA INVOICE": "D3D-PA364",
  "ADVANCE PAYMENT RECEIPT": "D3D-AA364",
};

async function fetchNextInvoiceNumbers() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/tapq/next-invoice-numbers`,
    );
    const data = await response.json();
    if (!response.ok || !data.success || !data.data?.nextNumbers) {
      return { ...FALLBACK_NEXT_INVOICE_NUMBERS };
    }
    return data.data.nextNumbers;
  } catch (err) {
    console.error("Failed to fetch next invoice numbers:", err);
    return { ...FALLBACK_NEXT_INVOICE_NUMBERS };
  }
}

// ── FETCH & EXTRACT UNIQUE CUSTOMERS FROM ALL DOCUMENTS ───────────────────
// Returns an array of unique customer objects, deduplicated by phone number.
// Most-recent document for each phone wins (higher createdAt takes precedence).
async function fetchExistingCustomers(apiBaseUrl) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/tapq/get-all-documents`);
    const data = await response.json();
    if (!response.ok || !data.success || !data.data?.documents) return [];

    const { documents } = data.data;
    const subcollections = [
      "taxInvoices",
      "quotations",
      "proformaInvoices",
      "advancePaymentReceipts",
    ];

    // Map from phone → { customer, createdAt } to keep the most-recent record
    const byPhone = new Map();

    for (const sub of subcollections) {
      const docs = documents[sub] || [];
      for (const doc of docs) {
        const c = doc.customer;
        if (!c || !c.phone) continue;
        const existing = byPhone.get(c.phone);
        if (!existing || (doc.createdAt || 0) > existing.createdAt) {
          byPhone.set(c.phone, {
            createdAt: doc.createdAt || 0,
            customer: {
              name: c.name || "",
              phone: c.phone || "",
              address: c.address || "",
              email: c.email || "",
              state: c.state || "",
            },
          });
        }
      }
    }

    return Array.from(byPhone.values())
      .map((v) => v.customer)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("Failed to fetch existing customers:", err);
    return [];
  }
}

function formatDocTypeLabel(docType) {
  if (!docType) return "Invoice";
  return docType
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function NumInput({ value, onChange, placeholder, className, style, min, step }) {
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

// ── CUSTOMER AUTOFILL DROPDOWN ────────────────────────────────────────────
function CustomerSuggest({ suggestions, onSelect }) {
  if (!suggestions.length) return null;
  return (
    <ul className="tapq-customer-suggest">
      {suggestions.map((c) => (
        <li
          key={c.phone}
          className="tapq-customer-suggest-item"
          onMouseDown={(e) => {
            e.preventDefault(); // prevent blur from firing before click
            onSelect(c);
          }}
        >
          <span className="tapq-suggest-name">{c.name}</span>
          <span className="tapq-suggest-phone">{c.phone}</span>
        </li>
      ))}
    </ul>
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
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState(null);

  // ── invoice number sequence state ─────────────────────────────────────
  const [nextInvoiceNumbers, setNextInvoiceNumbers] = useState(null);
  const [invoiceNumLoading, setInvoiceNumLoading] = useState(false);

  // ── CUSTOMER AUTOFILL STATE ───────────────────────────────────────────
  const [allCustomers, setAllCustomers] = useState([]);         // full list from DB
  const [nameSuggestions, setNameSuggestions] = useState([]);   // filtered for name field
  const [phoneSuggestions, setPhoneSuggestions] = useState([]); // filtered for phone field
  const [showNameSuggest, setShowNameSuggest] = useState(false);
  const [showPhoneSuggest, setShowPhoneSuggest] = useState(false);

  const qrCanvasRef = useRef(null);

  const computeDefaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  };

  useEffect(() => {
    setDueDate(computeDefaultDueDate());
  }, []);

  // Fetch existing customers once on mount
  useEffect(() => {
    fetchExistingCustomers(API_BASE_URL).then(setAllCustomers);
  }, []);

  const loadAndApplyInvoiceNumbers = async (docTypeToApply) => {
    setInvoiceNumLoading(true);
    try {
      const map = await fetchNextInvoiceNumbers();
      setNextInvoiceNumbers(map);
      const targetDocType = docTypeToApply || formData.docType;
      const nextNum = map[targetDocType];
      if (nextNum) {
        setFormData((prev) => ({ ...prev, invoiceNum: nextNum }));
      }
    } finally {
      setInvoiceNumLoading(false);
    }
  };

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
    setNameSuggestions([]);
    setPhoneSuggestions([]);
    setShowNameSuggest(false);
    setShowPhoneSuggest(false);
    if (!skipInvoiceFetch) {
      loadAndApplyInvoiceNumbers(INITIAL_FORM_DATA.docType);
    }
  };

  // ── AUTOFILL: apply a chosen customer into the form ───────────────────
  const applyCustomer = (customer) => {
    setFormData((prev) => ({
      ...prev,
      custName: customer.name,
      custPhone: customer.phone,
      custAddress: customer.address,
      custEmail: customer.email,
      custState: customer.state,
    }));
    setShowNameSuggest(false);
    setShowPhoneSuggest(false);
    setNameSuggestions([]);
    setPhoneSuggestions([]);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === "custAddress") {
      const singleLine = value.replace(/[\r\n]+/g, " ");
      setFormData((prev) => ({ ...prev, [name]: singleLine }));
      return;
    }

    if (name === "invoiceNum") return; // read-only

    if (name === "docType") {
      setFormData((prev) => ({ ...prev, [name]: value }));
      const nextNum = nextInvoiceNumbers?.[value];
      if (nextNum) {
        setFormData((prev) => ({ ...prev, invoiceNum: nextNum }));
      } else {
        loadAndApplyInvoiceNumbers(value);
      }
      return;
    }

    // ── Customer name: filter suggestions by name ─────────────────────
    if (name === "custName") {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (value.trim().length >= 1) {
        const q = value.trim().toLowerCase();
        const matches = allCustomers.filter((c) =>
          c.name.toLowerCase().includes(q)
        );
        setNameSuggestions(matches);
        setShowNameSuggest(matches.length > 0);
      } else {
        setNameSuggestions([]);
        setShowNameSuggest(false);
      }
      return;
    }

    // ── Customer phone: filter suggestions by phone ───────────────────
    if (name === "custPhone") {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (value.trim().length >= 1) {
        const q = value.trim();
        const matches = allCustomers.filter((c) => c.phone.includes(q));
        setPhoneSuggestions(matches);
        setShowPhoneSuggest(matches.length > 0);
      } else {
        setPhoneSuggestions([]);
        setShowPhoneSuggest(false);
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
      if (updated.length === 0) setShowAdvanceSection(false);
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
      custName: formData.custName,
      custPhone: formData.custPhone,
      custAddress: formData.custAddress,
      custEmail: formData.custEmail,
      custState: formData.custState,
      invoiceNum: formData.invoiceNum,
      docType: formData.docType,
      gstType: formData.gstType,
      invoiceDate: todayStr(),
      dueDate: dueDate,
      gstRates: {
        igstRate: gstRates.igstRate,
        cgstRate: gstRates.cgstRate,
        sgstRate: gstRates.sgstRate,
      },
      items: items.map((item) => ({
        desc: item.desc,
        hsn: item.hsn,
        qty: item.qty,
        price: item.price,
      })),
      taxable,
      gstTotal,
      total,
      totalAdvance,
      balancePayable,
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
        handleRefresh();
        // Refresh customer list so the newly saved customer appears next time
        fetchExistingCustomers(API_BASE_URL).then(setAllCustomers);
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

        setTimeout(() => {
          setSaveStatus("idle");
          setSaveError(null);
          handleRefresh();
        }, 4000);
      } catch (pdfError) {
        console.error("PDF generation also failed:", pdfError);
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

            {/* Customer Name with autofill dropdown */}
            <div className="tapq-form-group tapq-suggest-wrapper">
              <label>Customer Name *</label>
              <input
                type="text"
                name="custName"
                value={formData.custName}
                onChange={handleFormChange}
                onFocus={() => {
                  if (nameSuggestions.length > 0) setShowNameSuggest(true);
                }}
                onBlur={() => setTimeout(() => setShowNameSuggest(false), 150)}
                placeholder="e.g. Rameez Raja Sikandar"
                autoComplete="off"
              />
              {showNameSuggest && (
                <CustomerSuggest
                  suggestions={nameSuggestions}
                  onSelect={applyCustomer}
                />
              )}
            </div>

            {/* Customer Phone with autofill dropdown */}
            <div className="tapq-form-group tapq-suggest-wrapper">
              <label>Phone *</label>
              <input
                type="text"
                name="custPhone"
                value={formData.custPhone}
                onChange={handleFormChange}
                onFocus={() => {
                  if (phoneSuggestions.length > 0) setShowPhoneSuggest(true);
                }}
                onBlur={() => setTimeout(() => setShowPhoneSuggest(false), 150)}
                placeholder="e.g. 77094 45566"
                autoComplete="off"
              />
              {showPhoneSuggest && (
                <CustomerSuggest
                  suggestions={phoneSuggestions}
                  onSelect={applyCustomer}
                />
              )}
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
                readOnly
                className="tapq-invoice-num-readonly"
                title="Invoice number is auto-generated and cannot be modified"
                style={{
                  backgroundColor: "#f5f5f5",
                  cursor: "not-allowed",
                  opacity: 0.85,
                }}
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
            Invoice Number is auto-generated and{" "}
            <strong>cannot be modified</strong>.
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

          {saveStatus === "error" && saveError && (
            <p className="tapq-save-error">
              ⚠ Could not save to database: {saveError}. Your PDF was still
              downloaded.
            </p>
          )}

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