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
  QUOTATION: "D3D-QA364",
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
              gstin: c.gstin || "",
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

// NEW — returns the custom label for a round-off entry, or "Round off"
// if the user left it blank / never typed one.
function roundOffDisplayLabel(entry) {
  return entry?.label && entry.label.trim() ? entry.label.trim() : "Round off";
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
            e.preventDefault();
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

// ── REVIEW & CONFIRM MODAL ──────────────────────────────────────────────
// Shown after the user clicks "Generate Invoice PDF" and before anything
// actually happens. Nothing is saved to the DB and no PDF is created until
// the user explicitly clicks "Confirm & Generate" inside this modal.
// Styled inline (no new CSS file classes) to keep this self-contained.
function ReviewModal({
  formData,
  items,
  gst,
  taxable,
  gstTotal,
  total,
  totalRoundOff,
  balancePayable,
  appliedRoundOffs,
  dueDate,
  noSignature,
  isSubmitting,
  onCancel,
  onConfirm,
}) {
  const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 32, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  };

  const boxStyle = {
    background: "white",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "640px",
    maxHeight: "88vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    overflow: "hidden",
  };

  const headerStyle = {
    padding: "18px 24px",
    borderBottom: "1px solid #eef1f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "linear-gradient(135deg, #1a2332 0%, #2d4a6e 100%)",
  };

  const bodyStyle = {
    padding: "20px 24px",
    overflowY: "auto",
    flex: 1,
  };

  const footerStyle = {
    padding: "16px 24px",
    borderTop: "1px solid #eef1f6",
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    background: "#fafbfc",
  };

  const sectionTitleStyle = {
    fontSize: "11px",
    fontWeight: 700,
    color: "#3a7bd5",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: "8px",
    marginTop: "18px",
  };

  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#1a2332",
    padding: "5px 0",
    borderBottom: "1px dashed #f0f4f8",
  };

  const rowLabelStyle = { color: "#5a6a7e" };

  const itemCardStyle = {
    border: "1px solid #eef1f6",
    borderRadius: "9px",
    padding: "10px 12px",
    marginBottom: "8px",
    background: "#fafbfc",
  };

  const codeColLabel =
    items.length > 0 &&
    items.every((it) => (it.codeType || "HSN") === items[0].codeType)
      ? (items[0].codeType || "HSN") === "SAC"
        ? "SAC"
        : "HSN"
      : "HSN/SAC";

  return (
    <div style={overlayStyle} onMouseDown={onCancel}>
      <div style={boxStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <div style={{ color: "white", fontSize: "15px", fontWeight: 700 }}>
              Review Before Generating
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "11.5px",
                marginTop: "2px",
              }}
            >
              Please check everything below is correct
            </div>
          </div>
          <button
            onClick={onCancel}
            title="Close"
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "white",
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={bodyStyle}>
          {/* Customer */}
          <div style={sectionTitleStyle}>Customer Details</div>
          <div style={rowStyle}>
            <span style={rowLabelStyle}>Name</span>
            <span>{formData.custName || "—"}</span>
          </div>
          <div style={rowStyle}>
            <span style={rowLabelStyle}>Phone</span>
            <span>{formData.custPhone || "—"}</span>
          </div>
          <div style={rowStyle}>
            <span style={rowLabelStyle}>Address</span>
            <span style={{ textAlign: "right", maxWidth: "70%" }}>
              {formData.custAddress || "—"}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={rowLabelStyle}>Email</span>
            <span>{formData.custEmail || "NA"}</span>
          </div>
          <div style={rowStyle}>
            <span style={rowLabelStyle}>State</span>
            <span>{formData.custState || "—"}</span>
          </div>
          {formData.custGstin && (
            <div style={rowStyle}>
              <span style={rowLabelStyle}>GSTIN</span>
              <span>{formData.custGstin}</span>
            </div>
          )}

          {/* Invoice details */}
          <div style={sectionTitleStyle}>
            {formatDocTypeLabel(formData.docType)} Details
          </div>
          <div style={rowStyle}>
            <span style={rowLabelStyle}>
              {formatDocTypeLabel(formData.docType)} Number
            </span>
            <span>{formData.invoiceNum || "—"}</span>
          </div>
          <div style={rowStyle}>
            <span style={rowLabelStyle}>Document Type</span>
            <span>{formatDocTypeLabel(formData.docType)}</span>
          </div>
          {formData.docType === "TAX INVOICE" && (
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Due Date</span>
              <span>{dueDate || "—"}</span>
            </div>
          )}
          <div style={rowStyle}>
            <span style={rowLabelStyle}>GST Type</span>
            <span>{gst.type === "igst" ? "IGST" : "CGST + SGST"}</span>
          </div>
          <div style={rowStyle}>
            <span style={rowLabelStyle}>Signature</span>
            <span>
              {noSignature ? "Blank (manual signature)" : "Digital signature"}
            </span>
          </div>
          {formData.specialNotes && (
            <div style={rowStyle}>
              <span style={rowLabelStyle}>Special Notes</span>
              <span style={{ textAlign: "right", maxWidth: "70%" }}>
                {formData.specialNotes}
              </span>
            </div>
          )}

          {/* Items */}
          <div style={sectionTitleStyle}>Items ({items.length})</div>
          {items.map((item, idx) => {
            const q = parseFloat(item.qty) || 0;
            const p = parseFloat(item.price) || 0;
            const lineTaxable = q * p;
            const lineGst = (lineTaxable * gst.rate) / 100;
            const lineAmt = lineTaxable + lineGst;
            return (
              <div key={item.id} style={itemCardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1a2332",
                    marginBottom: "4px",
                  }}
                >
                  <span>
                    {idx + 1}. {item.desc || "(no description)"}
                  </span>
                  <span>Rs. {lineAmt.toFixed(2)}</span>
                </div>
                <div style={{ fontSize: "11.5px", color: "#5a6a7e" }}>
                  {(item.codeType || "HSN")} Code: {item.hsn || "—"} &nbsp;•&nbsp;
                  Qty: {q} &nbsp;•&nbsp; Price: Rs. {p.toFixed(2)} &nbsp;•&nbsp;
                  GST: Rs. {lineGst.toFixed(2)}
                </div>
              </div>
            );
          })}

          {/* Totals */}
          <div style={sectionTitleStyle}>Totals</div>
          <div style={rowStyle}>
            <span style={rowLabelStyle}>Taxable Value</span>
            <span>Rs. {taxable.toFixed(2)}</span>
          </div>
          {gst.type === "igst" ? (
            <div style={rowStyle}>
              <span style={rowLabelStyle}>IGST @ {gst.rate}%</span>
              <span>Rs. {gstTotal.toFixed(2)}</span>
            </div>
          ) : (
            <>
              <div style={rowStyle}>
                <span style={rowLabelStyle}>CGST @ {gst.cgst}%</span>
                <span>Rs. {((taxable * gst.cgst) / 100).toFixed(2)}</span>
              </div>
              <div style={rowStyle}>
                <span style={rowLabelStyle}>SGST @ {gst.sgst}%</span>
                <span>Rs. {((taxable * gst.sgst) / 100).toFixed(2)}</span>
              </div>
            </>
          )}
          <div style={rowStyle}>
            <span style={rowLabelStyle}>
              {appliedRoundOffs.length > 0 ? "Amount" : "Total Amount"}
            </span>
            <span>Rs. {total.toFixed(2)}</span>
          </div>
          {appliedRoundOffs.map((ro, idx) => (
            <div key={idx} style={rowStyle}>
              {/* CHANGED — uses the entry's custom label, falls back to "Round off" */}
              <span style={rowLabelStyle}>{roundOffDisplayLabel(ro)}</span>
              <span style={{ color: "#1e8c50", fontWeight: 600 }}>
                {ro.sign === "-" ? "− " : "+ "}Rs.{" "}
                {parseFloat(ro.amount).toFixed(2)}
              </span>
            </div>
          ))}
          <div
            style={{
              ...rowStyle,
              borderBottom: "none",
              borderTop: "2px solid #1a2332",
              paddingTop: "10px",
              marginTop: "4px",
              fontSize: "15px",
              fontWeight: 800,
            }}
          >
            <span>Final Total</span>
            <span>
              Rs.{" "}
              {(appliedRoundOffs.length > 0 ? balancePayable : total).toFixed(
                2,
              )}
            </span>
          </div>
        </div>

        <div style={footerStyle}>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              padding: "11px 20px",
              borderRadius: "9px",
              border: "1.5px solid #dde3ec",
              background: "white",
              color: "#5a6a7e",
              fontWeight: 600,
              fontSize: "13px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            ← Back &amp; Edit
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{
              padding: "11px 22px",
              borderRadius: "9px",
              border: "none",
              background: isSubmitting
                ? "#8ea3bd"
                : "linear-gradient(135deg, #1a2332, #2d4a6e)",
              color: "white",
              fontWeight: 700,
              fontSize: "13px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              letterSpacing: "0.3px",
            }}
          >
            {isSubmitting
              ? "⏳ Saving & Generating..."
              : "✓ Confirm & Generate PDF"}
          </button>
        </div>
      </div>
    </div>
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

  const [showRoundOffSection, setShowRoundOffSection] = useState(false);
  const [roundOffEntries, setRoundOffEntries] = useState([]);
  const [roundOffEntryCounter, setRoundOffEntryCounter] = useState(1);

  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState(null);

  // NEW — controls the review/confirm popup shown before anything is
  // actually saved or generated.
  const [showReviewModal, setShowReviewModal] = useState(false);

  // NEW — "No Signature" checkbox (header). Unchecked by default. When
  // checked, the generated PDF skips the saved signature image and leaves
  // an empty box for a manual/wet signature instead.
  const [noSignature, setNoSignature] = useState(false);

  const [nextInvoiceNumbers, setNextInvoiceNumbers] = useState(null);
  const [invoiceNumLoading, setInvoiceNumLoading] = useState(false);

  const [allCustomers, setAllCustomers] = useState([]);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);
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
    setShowRoundOffSection(false);
    setRoundOffEntries([]);
    setRoundOffEntryCounter(1);
    setSaveStatus("idle");
    setSaveError(null);
    setNameSuggestions([]);
    setPhoneSuggestions([]);
    setShowNameSuggest(false);
    setShowPhoneSuggest(false);
    setNoSignature(false); // NEW — reset the checkbox back to default
    if (!skipInvoiceFetch) {
      loadAndApplyInvoiceNumbers(INITIAL_FORM_DATA.docType);
    }
  };

  const applyCustomer = (customer) => {
    setFormData((prev) => ({
      ...prev,
      custName: customer.name,
      custPhone: customer.phone,
      custAddress: customer.address,
      custEmail: customer.email,
      custState: customer.state,
      custGstin: customer.gstin || "",
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

    if (name === "invoiceNum") return;

    if (name === "custGstin") {
      setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

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

    if (name === "custName") {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (value.trim().length >= 1) {
        const q = value.trim().toLowerCase();
        const matches = allCustomers.filter((c) =>
          c.name.toLowerCase().includes(q),
        );
        setNameSuggestions(matches);
        setShowNameSuggest(matches.length > 0);
      } else {
        setNameSuggestions([]);
        setShowNameSuggest(false);
      }
      return;
    }

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

  // ── ITEM HANDLERS ─────────────────────────────────────────────────────
  // NEW — each item now defaults to codeType: "HSN"
  const handleAddItem = () => {
    const newId = itemIdCounter;
    setItems((prev) => [
      ...prev,
      { id: newId, desc: "", hsn: "", codeType: "HSN", qty: 1, price: "" },
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

  // ── ROUND OFF HANDLERS ─────────────────────────────────────────────────
  // CHANGED — every new round-off entry now also carries a `label` field.
  // It starts empty; the input shows placeholder text "Round off" so the
  // user sees the default without it being "typed in", and if they never
  // touch it, roundOffDisplayLabel()/backend both fall back to "Round off".

  const handleOpenRoundOffSection = () => {
    setShowRoundOffSection(true);
    const newId = roundOffEntryCounter;
    setRoundOffEntries([
      { id: newId, amount: "", sign: "+", label: "", applied: false },
    ]);
    setRoundOffEntryCounter(newId + 1);
  };

  const handleCloseRoundOffSection = () => {
    setShowRoundOffSection(false);
    setRoundOffEntries([]);
  };

  const handleRoundOffEntryChange = (id, field, value) => {
    setRoundOffEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  const handleToggleRoundOffSign = (id) => {
    setRoundOffEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, sign: e.sign === "+" ? "-" : "+" } : e,
      ),
    );
  };

  const handleApplyRoundOffEntry = (id) => {
    setRoundOffEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, applied: true } : e)),
    );
  };

  const handleAddAnotherRoundOff = () => {
    const newId = roundOffEntryCounter;
    setRoundOffEntries((prev) => [
      ...prev,
      { id: newId, amount: "", sign: "+", label: "", applied: false },
    ]);
    setRoundOffEntryCounter(newId + 1);
  };

  const handleRemoveRoundOffEntry = (id) => {
    setRoundOffEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      if (updated.length === 0) setShowRoundOffSection(false);
      return updated;
    });
  };

  const handleEditRoundOffEntry = (id) => {
    setRoundOffEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, applied: false } : e)),
    );
  };

  // ── TOTALS ────────────────────────────────────────────────────────────────
  // NOTE: calculateTotals() lives in AdminTapqPdf.js. Make sure the mapping
  // it uses to build `appliedRoundOffs` from `roundOffEntries` also passes
  // through `label`, e.g.:
  //   roundOffEntries.filter(e => e.applied).map(e => ({
  //     id: e.id, amount: e.amount, sign: e.sign, label: e.label,
  //   }))

  const {
    taxable,
    gstTotal,
    total,
    gst,
    totalRoundOff,
    balancePayable,
    appliedRoundOffs,
  } = calculateTotals(items, formData.gstType, gstRates, roundOffEntries);

  const allApplied =
    roundOffEntries.length > 0 && roundOffEntries.every((e) => e.applied);

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
      custGstin: formData.custGstin,
      invoiceNum: formData.invoiceNum,
      docType: formData.docType,
      gstType: formData.gstType,
      invoiceDate: todayStr(),
      dueDate: dueDate,
      specialNotes: formData.specialNotes,
      gstRates: {
        igstRate: gstRates.igstRate,
        cgstRate: gstRates.cgstRate,
        sgstRate: gstRates.sgstRate,
      },
      items: items.map((item) => ({
        desc: item.desc,
        hsn: item.hsn,
        codeType: item.codeType || "HSN", // NEW — sent to backend
        qty: item.qty,
        price: item.price,
      })),
      taxable,
      gstTotal,
      total,
      totalRoundOff,
      balancePayable,
      appliedRoundOffs: appliedRoundOffs.map((ro) => ({
        amount: ro.amount,
        sign: ro.sign,
        // CHANGED — send the custom label, defaulting to "Round off"
        label: ro.label && ro.label.trim() ? ro.label.trim() : "Round off",
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

  // ── ACTUAL SAVE + GENERATE (unchanged logic) ────────────────────────────
  // This is exactly the previous handleGeneratePDF body — the only changes
  // are: (1) WHEN this runs (only after the user reviews everything in the
  // modal and clicks "Confirm & Generate PDF"), and (2) the `noSignature`
  // flag is now forwarded into generatePDF() so the PDF can leave a blank
  // signature box when the header checkbox is checked.
  const handleGeneratePDF = async () => {
    if (!formValid) return;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const [qrData, sigImg, saveResult] = await Promise.all([
        generateQR(
          "upi://pay?pa=9483914542@kotak811&pn=MohammedAdilBetageri&am=" +
            (appliedRoundOffs.length > 0 ? balancePayable : total).toFixed(2) +
            "&cu=INR",
          qrCanvasRef,
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
        totalRoundOff,
        balancePayable,
        total,
        taxable,
        gstTotal,
        qrData,
        sigImg,
        appliedRoundOffs,
        noSignature, // NEW
      });

      setSaveStatus("saved");
      setTimeout(() => {
        setSaveStatus("idle");
        handleRefresh();
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
              (appliedRoundOffs.length > 0 ? balancePayable : total).toFixed(
                2,
              ) +
              "&cu=INR",
            qrCanvasRef,
          ),
          getSignatureDataURL(),
        ]);

        await generatePDF({
          formData,
          items,
          gstRates,
          dueDate,
          totalRoundOff,
          balancePayable,
          total,
          taxable,
          gstTotal,
          qrData,
          sigImg,
          appliedRoundOffs,
          noSignature, // NEW
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

  // NEW — clicking the main button no longer generates anything directly.
  // It just opens the review popup (only if the form is actually valid).
  const handleOpenReview = () => {
    if (!formValid) return;
    setShowReviewModal(true);
  };

  // NEW — called from inside the review modal's "Confirm & Generate PDF"
  // button. Keeps the modal open (showing a saving state) until the save +
  // PDF flow finishes, then closes it — mirroring the existing saveStatus
  // lifecycle so nothing else about that flow changes.
  const handleConfirmFromReview = async () => {
    await handleGeneratePDF();
    setShowReviewModal(false);
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
          {/* NEW — "No Signature" checkbox. Unchecked by default. When
              checked, the generated PDF leaves an empty box instead of the
              saved signature image, for manual/wet signing. */}
          <label
            className="tapq-nosign-toggle"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "white",
              fontSize: "13px",
              cursor: "pointer",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
            title="If checked, the PDF will leave a blank space for a manual signature instead of using the saved signature image"
          >
            <input
              type="checkbox"
              checked={noSignature}
              onChange={(e) => setNoSignature(e.target.checked)}
            />
            No Signature
          </label>
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

            <div className="tapq-form-group">
              <label>GSTIN (optional)</label>
              <input
                type="text"
                name="custGstin"
                value={formData.custGstin}
                onChange={handleFormChange}
                placeholder="e.g. 29ABCDE1234F1Z5"
                maxLength={15}
                style={{ textTransform: "uppercase" }}
                autoComplete="off"
              />
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
                  <span className="tapq-inv-loading-hint">
                    (fetching next #...)
                  </span>
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

          <div
            className="tapq-form-group tapq-span2"
            style={{ marginTop: "12px" }}
          >
            <label>Special Notes (optional)</label>
            <textarea
              name="specialNotes"
              value={formData.specialNotes}
              onChange={handleFormChange}
              placeholder="Any additional notes to include on the document..."
              rows={3}
              style={{
                width: "100%",
                resize: "vertical",
                fontFamily: "inherit",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                boxSizing: "border-box",
              }}
            />
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
            <span>HSN/SAC</span>
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

                  <div className="tapq-item-code-group">
                    <select
                      className="tapq-item-code-select"
                      value={item.codeType || "HSN"}
                      onChange={(e) =>
                        handleItemChange(item.id, "codeType", e.target.value)
                      }
                    >
                      <option value="HSN">HSN</option>
                      <option value="SAC">SAC</option>
                    </select>
                    <input
                      type="text"
                      className="tapq-item-code-input"
                      placeholder={
                        (item.codeType || "HSN") === "SAC"
                          ? "SAC code"
                          : "HSN code"
                      }
                      value={item.hsn}
                      onChange={(e) =>
                        handleItemChange(item.id, "hsn", e.target.value)
                      }
                    />
                  </div>

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

          <div className="tapq-totals-bottom">
            <div className="tapq-advance-section">
              {!showRoundOffSection ? (
                <button
                  className="tapq-btn-advance"
                  onClick={handleOpenRoundOffSection}
                >
                  + Add Round Off
                </button>
              ) : (
                <div className="tapq-advance-box">
                  <div className="tapq-advance-header">
                    <span className="tapq-advance-label">Round Off</span>
                    <button
                      className="tapq-advance-close"
                      onClick={handleCloseRoundOffSection}
                    >
                      ×
                    </button>
                  </div>

                  <div className="tapq-advance-entries">
                    {roundOffEntries.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className={`tapq-advance-entry ${entry.applied ? "tapq-advance-entry--applied" : ""}`}
                      >
                        <div className="tapq-advance-entry-label">
                          <span className="tapq-advance-entry-num">
                            #{idx + 1}
                          </span>
                          {entry.applied && (
                            <span className="tapq-advance-entry-id-badge">
                              {/* CHANGED — shows custom label if user set one */}
                              {roundOffDisplayLabel(entry)}
                            </span>
                          )}
                        </div>

                        {entry.applied ? (
                          <div className="tapq-advance-applied-row">
                            <div className="tapq-advance-applied-info">
                              <span className="tapq-advance-applied-id">
                                {/* CHANGED — shows custom label if user set one */}
                                {roundOffDisplayLabel(entry)}
                              </span>
                              <span className="tapq-advance-applied-amt">
                                {entry.sign === "-" ? "− " : "+ "}Rs.{" "}
                                {parseFloat(entry.amount || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="tapq-advance-applied-actions">
                              <button
                                className="tapq-btn-edit-adv"
                                onClick={() =>
                                  handleEditRoundOffEntry(entry.id)
                                }
                                title="Edit"
                              >
                                ✎
                              </button>
                              <button
                                className="tapq-btn-remove-adv"
                                onClick={() =>
                                  handleRemoveRoundOffEntry(entry.id)
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
                              {/* CHANGED — was a static "Round off" span,
                                  now an editable text input. Placeholder
                                  shows "Round off" as the default; if the
                                  user leaves it blank that default is used
                                  everywhere (display + saved data). */}
                              <input
                                type="text"
                                className="tapq-advance-fixed-label tapq-advance-label-input"
                                placeholder="Round off"
                                value={entry.label}
                                maxLength={40}
                                onChange={(e) =>
                                  handleRoundOffEntryChange(
                                    entry.id,
                                    "label",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="tapq-advance-input-row">
                              <button
                                type="button"
                                className="tapq-btn-sign-toggle"
                                onClick={() =>
                                  handleToggleRoundOffSign(entry.id)
                                }
                                title={
                                  entry.sign === "-"
                                    ? "Switch to add (+)"
                                    : "Switch to subtract (−)"
                                }
                              >
                                {entry.sign === "-" ? "−" : "+"}
                              </button>
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
                                  handleRoundOffEntryChange(
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
                                  handleApplyRoundOffEntry(entry.id)
                                }
                              >
                                ✓ Apply
                              </button>
                              {roundOffEntries.length > 1 && (
                                <button
                                  className="tapq-btn-remove-adv"
                                  onClick={() =>
                                    handleRemoveRoundOffEntry(entry.id)
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
                      onClick={handleAddAnotherRoundOff}
                    >
                      + Add Another Round Off
                    </button>
                  )}

                  {appliedRoundOffs.length > 1 && (
                    <div className="tapq-advance-summary">
                      <span>Total Round Off</span>
                      <strong>
                        {totalRoundOff < 0 ? "− " : "+ "}Rs.{" "}
                        {Math.abs(totalRoundOff).toFixed(2)}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                <span>
                  {appliedRoundOffs.length > 0 ? "Amount" : "Total Amount"}
                </span>
                <span>Rs. {total.toFixed(2)}</span>
              </div>

              {appliedRoundOffs.map((ro, idx) => (
                <div key={ro.id} className="tapq-total-row tapq-advance-row">
                  {/* CHANGED — uses the entry's custom label */}
                  <span>{roundOffDisplayLabel(ro)}</span>
                  <span>
                    {ro.sign === "-" ? "− " : "+ "}Rs.{" "}
                    {parseFloat(ro.amount).toFixed(2)}
                  </span>
                </div>
              ))}

              {appliedRoundOffs.length > 1 && (
                <div className="tapq-total-row tapq-advance-row tapq-advance-total-row">
                  <span>Total Round Off</span>
                  <span>
                    {totalRoundOff < 0 ? "− " : "+ "}Rs.{" "}
                    {Math.abs(totalRoundOff).toFixed(2)}
                  </span>
                </div>
              )}

              {appliedRoundOffs.length > 0 && (
                <div className="tapq-total-row tapq-balance-row">
                  <span>Total Amount</span>
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
            onClick={handleOpenReview}
            disabled={!formValid || saveStatus === "saving"}
            title={
              !formValid
                ? "Fill all required fields to generate PDF"
                : "Review before generating PDF"
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

      {/* NEW — Review & Confirm popup. Rendered on top of everything else;
          nothing is saved/generated until the user confirms inside it. */}
      {showReviewModal && (
        <ReviewModal
          formData={formData}
          items={items}
          gst={gst}
          taxable={taxable}
          gstTotal={gstTotal}
          total={total}
          totalRoundOff={totalRoundOff}
          balancePayable={balancePayable}
          appliedRoundOffs={appliedRoundOffs}
          dueDate={dueDate}
          noSignature={noSignature}
          isSubmitting={saveStatus === "saving"}
          onCancel={() => {
            if (saveStatus !== "saving") setShowReviewModal(false);
          }}
          onConfirm={handleConfirmFromReview}
        />
      )}

      <div
        id="tapq-qr-hidden"
        ref={qrCanvasRef}
        style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
      ></div>
    </div>
  );
}