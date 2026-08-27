import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/logo-1.png";
import "./TapqDocs.css";
import {
  todayStr,
  calculateTotals,
  generateQR,
  getSignatureDataURL,
  generatePDF,
  GST_STATES,
  isFormValid,
  getRoundOffLabel, // NEW — shared label-fallback helper from AdminTapqPdf.js
  TERMS_DATA, // NEW — default terms, used to seed the editable textarea
  termsDataToText, // NEW — converts TERMS_DATA structure -> editable plain text
  textToTermsData, // NEW — converts edited plain text back -> TERMS_DATA structure
} from "./AdminTapqPdf";
import API_BASE_URL from "./apiConfig";

// ── DOC TYPE CONFIG ─────────────────────────────────────────────────────────
// Maps the dropdown filter value -> backend subcollection key -> the
// docType string expected by generatePDF (must match formData.docType in
// AdminTapq.js / AdminTapqPdf.js, e.g. "TAX INVOICE").
const DOC_TYPE_CONFIG = [
  {
    value: "taxInvoices",
    label: "Tax Invoices",
    docType: "TAX INVOICE",
  },
  {
    value: "quotations",
    label: "Quotations",
    docType: "QUOTATION",
  },
  {
    value: "proformaInvoices",
    label: "Proforma Invoices",
    docType: "PROFORMA INVOICE",
  },
  {
    value: "advancePaymentReceipts",
    label: "Advance P R",
    docType: "ADVANCE PAYMENT RECEIPT",
  },
];

const DOC_TYPE_BY_KEY = DOC_TYPE_CONFIG.reduce((acc, cfg) => {
  acc[cfg.value] = cfg;
  return acc;
}, {});

function formatTimestamp(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    pad(d.getDate()) +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    d.getFullYear() +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

// ── EDIT DOCUMENT MODAL ─────────────────────────────────────────────────────
// Opened via the "✎ Edit" button on a row. Lets the user change customer
// details, items, GST rates, round-offs, due date, and special notes for an
// already-saved document, then on save: (1) PUTs the changes to the backend
// so the database record is updated, and (2) regenerates + downloads the PDF
// with the edited values using the same generatePDF() renderer used
// everywhere else. Document Type is intentionally locked (not editable) —
// changing it would mean moving the record between Firebase subcollections,
// which the update-document endpoint does not support.
function EditDocumentModal({ doc, qrCanvasRef, onCancel, onSaved }) {
  const cfg = doc.__cfg;

  const [formData, setFormData] = useState({
    custName: doc.customer?.name || "",
    custPhone: doc.customer?.phone || "",
    custAddress: doc.customer?.address || "",
    custEmail: doc.customer?.email || "",
    custState: doc.customer?.state || "Karnataka, Code : 29",
    custGstin: doc.customer?.gstin || "",
    invoiceNum: doc.document?.invoiceNum || "",
    // FIXED — the original document date was never loaded here, so
    // generatePDF() had nothing to use and fell back to today's date
    // (todayStr()) whenever a document was edited & saved. The saved
    // date shown in the table (doc.document?.invoiceDate) is now carried
    // into formData so the regenerated PDF keeps the ORIGINAL doc date,
    // not the date the edit happened to be made on. Only fall back to
    // todayStr() for legacy records that never had a date saved at all.
    invoiceDate: doc.document?.invoiceDate || todayStr(),
    docType: cfg ? cfg.docType : doc.document?.docType || "TAX INVOICE",
    gstType: doc.document?.gstType || "igst",
    specialNotes: doc.document?.specialNotes || "",
  });

  const [dueDate, setDueDate] = useState(doc.document?.dueDate || "");

  const [gstRates, setGstRates] = useState({
    igstRate: doc.gstRates?.igstRate ?? 18,
    cgstRate: doc.gstRates?.cgstRate ?? 9,
    sgstRate: doc.gstRates?.sgstRate ?? 9,
  });

  const [items, setItems] = useState(
    (doc.items || []).map((it, idx) => ({
      id: idx,
      desc: it.desc || "",
      hsn: it.hsn || "",
      codeType: it.codeType || "HSN",
      qty: it.qty ?? 1,
      price: it.price ?? "",
    })),
  );
  const [itemIdCounter, setItemIdCounter] = useState(items.length);

  // Existing saved documents may have round-off data stored under the old
  // `appliedAdvances` name or the newer `appliedRoundOffs` name — read
  // whichever is present so older records still load correctly here.
  // CHANGED — each entry now also carries a `label` (falls back to "" if
  // the saved record predates the label feature, which then falls back to
  // "Round off" everywhere via getRoundOffLabel()).
  const savedRoundOffs = doc.appliedRoundOffs || doc.appliedAdvances || [];
  const [roundOffs, setRoundOffs] = useState(
    savedRoundOffs.map((ro, idx) => ({
      id: idx,
      amount: ro.amount ?? "",
      sign: ro.sign === "-" ? "-" : "+",
      label: ro.label || "",
    })),
  );
  const [roundOffCounter, setRoundOffCounter] = useState(roundOffs.length);

  const [noSignature, setNoSignature] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // NEW — Terms & Conditions are editable here for THIS PDF regeneration
  // only. They are intentionally never sent to the backend / saved to the
  // document record — every time the modal opens, this starts from the
  // same default TERMS_DATA (from AdminTapqPdf.js), not from anything
  // previously stored. Edits only affect the PDF produced by "Save &
  // Regenerate PDF" for this one action.
  const [termsText, setTermsText] = useState(() => termsDataToText(TERMS_DATA));

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "custAddress") {
      setFormData((p) => ({ ...p, custAddress: value.replace(/[\r\n]+/g, " ") }));
      return;
    }
    if (name === "custGstin") {
      setFormData((p) => ({ ...p, custGstin: value.toUpperCase() }));
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              [field]:
                field === "qty" || field === "price"
                  ? value === ""
                    ? ""
                    : parseFloat(value) || 0
                  : value,
            }
          : it,
      ),
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: itemIdCounter, desc: "", hsn: "", codeType: "HSN", qty: 1, price: "" },
    ]);
    setItemIdCounter((c) => c + 1);
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // NEW — lets the user change the IGST / CGST / SGST percentage directly
  // in the edit modal, same as the % inputs on the main create form. Was
  // previously missing here — gstRates was loaded from the saved document
  // but there was no way to edit it.
  const handleGstRateChange = (e) => {
    const { name, value } = e.target;
    setGstRates((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  // CHANGED — new round-off rows also start with an empty `label`.
  const handleAddRoundOff = () => {
    setRoundOffs((prev) => [
      ...prev,
      { id: roundOffCounter, amount: "", sign: "+", label: "" },
    ]);
    setRoundOffCounter((c) => c + 1);
  };

  const handleRoundOffChange = (id, field, value) => {
    setRoundOffs((prev) => prev.map((ro) => (ro.id === id ? { ...ro, [field]: value } : ro)));
  };

  const handleToggleRoundOffSign = (id) => {
    setRoundOffs((prev) =>
      prev.map((ro) => (ro.id === id ? { ...ro, sign: ro.sign === "-" ? "+" : "-" } : ro)),
    );
  };

  const handleRemoveRoundOff = (id) => {
    setRoundOffs((prev) => prev.filter((ro) => ro.id !== id));
  };

  // calculateTotals only counts entries whose `applied` flag is true — every
  // row in this modal is meant to apply directly, so mark them all applied
  // at calculation time rather than requiring a separate "Apply" step.
  // `label` rides along inside each spread entry, same as amount/sign.
  const roundOffEntriesForCalc = roundOffs
    .filter((ro) => ro.amount !== "" && parseFloat(ro.amount) > 0)
    .map((ro) => ({ ...ro, applied: true }));

  const { taxable, gstTotal, total, gst, totalRoundOff, balancePayable, appliedRoundOffs } =
    calculateTotals(items, formData.gstType, gstRates, roundOffEntriesForCalc);

  const formValid = isFormValid(formData, items);

  const handleSave = async () => {
    if (!formValid) {
      setError(
        "Please fill in all required fields (name, phone, address, doc number, and valid items).",
      );
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        custName: formData.custName,
        custPhone: formData.custPhone,
        custAddress: formData.custAddress,
        custEmail: formData.custEmail,
        custState: formData.custState,
        custGstin: formData.custGstin,
        invoiceNum: formData.invoiceNum,
        // FIXED — send the ORIGINAL doc date back to the backend so the
        // database record's date is never overwritten with "today" just
        // because an edit was made.
        invoiceDate: formData.invoiceDate,
        docType: formData.docType, // locked, sent unchanged
        gstType: formData.gstType,
        dueDate,
        specialNotes: formData.specialNotes,
        gstRates,
        items: items.map((it) => ({
          desc: it.desc,
          hsn: it.hsn,
          codeType: it.codeType || "HSN",
          qty: it.qty,
          price: it.price,
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
        // Preserve the existing payment-received flag on save so editing
        // a document never silently resets its payment status.
        paymentReceived: doc.document?.paymentReceived === true,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/tapq/update-document/${doc.documentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update document");
      }

      // Regenerate the PDF with the edited values, using the same renderer
      // as document creation / regeneration.
      // NOTE: `formData` (passed below) now carries the original
      // `invoiceDate`, so generatePDF() prints the same date as the
      // original document instead of defaulting to today's date.
      const amountForQR = totalRoundOff !== 0 ? balancePayable : total;
      const [qrData, sigImg] = await Promise.all([
        generateQR(
          "upi://pay?pa=9483914542@kotak811&pn=MohammedAdilBetageri&am=" +
            amountForQR.toFixed(2) +
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
        noSignature,
        // NEW — PDF-only custom terms, parsed from the editable textarea.
        // Never included in `payload` above, so the database record is
        // completely untouched by this.
        termsData: textToTermsData(termsText),
      });

      onSaved({
        ...doc,
        customer: {
          name: formData.custName,
          phone: formData.custPhone,
          address: formData.custAddress,
          email: formData.custEmail,
          state: formData.custState,
          gstin: formData.custGstin,
        },
        document: {
          ...doc.document,
          invoiceNum: formData.invoiceNum,
          // FIXED — keep the original date in the locally-patched record
          // too, so the table view can never drift from what was saved.
          invoiceDate: formData.invoiceDate,
          gstType: formData.gstType,
          dueDate,
          specialNotes: formData.specialNotes,
          // Carried through unchanged — see payload.paymentReceived above.
          paymentReceived: doc.document?.paymentReceived === true,
        },
        gstRates,
        items: payload.items,
        totals: { taxable, gstTotal, total, totalRoundOff, balancePayable },
        appliedRoundOffs: payload.appliedRoundOffs,
      });
    } catch (err) {
      console.error("Failed to save edited document:", err);
      setError(err.message || "Something went wrong while saving");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="tapqdocs-modal-overlay"
      onMouseDown={() => !isSaving && onCancel()}
    >
      <div className="tapqdocs-modal-box" onMouseDown={(e) => e.stopPropagation()}>
        <div className="tapqdocs-modal-header">
          <div>
            <div className="tapqdocs-modal-title">
              Edit {cfg ? cfg.label.replace(/s$/, "") : "Document"}
            </div>
            <div className="tapqdocs-modal-subtitle">
              Changes save to the database and regenerate the PDF
            </div>
          </div>
          <button
            className="tapqdocs-modal-close-btn"
            onClick={onCancel}
            disabled={isSaving}
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="tapqdocs-modal-body">
          {error && <div className="tapqdocs-modal-error">⚠ {error}</div>}

          <div className="tapqdocs-modal-section-title">Customer Details</div>
          <div className="tapqdocs-modal-grid">
            <input
              name="custName"
              value={formData.custName}
              onChange={handleFormChange}
              placeholder="Customer Name *"
            />
            <input
              name="custPhone"
              value={formData.custPhone}
              onChange={handleFormChange}
              placeholder="Phone *"
            />
            <input
              name="custAddress"
              value={formData.custAddress}
              onChange={handleFormChange}
              placeholder="Address *"
              className="tapqdocs-modal-span2"
            />
            <input
              name="custEmail"
              value={formData.custEmail}
              onChange={handleFormChange}
              placeholder="Email"
            />
            <select name="custState" value={formData.custState} onChange={handleFormChange}>
              {GST_STATES.map(([name, code]) => (
                <option key={code} value={`${name}, Code : ${code}`}>
                  {name} (Code : {code})
                </option>
              ))}
            </select>
            <input
              name="custGstin"
              value={formData.custGstin}
              onChange={handleFormChange}
              placeholder="GSTIN (optional)"
              className="tapqdocs-modal-uppercase"
            />
          </div>

          <div className="tapqdocs-modal-section-title">
            {cfg ? cfg.label.replace(/s$/, "") : "Document"} Details
          </div>
          <div className="tapqdocs-modal-grid">
            <input
              name="invoiceNum"
              value={formData.invoiceNum}
              onChange={handleFormChange}
              placeholder="Doc Number *"
            />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <select name="gstType" value={formData.gstType} onChange={handleFormChange}>
              <option value="igst">IGST</option>
              <option value="cgst_sgst">CGST + SGST</option>
            </select>
            <div className="tapqdocs-modal-locked-type">
              Document Type: <strong>{formData.docType}</strong> (locked)
            </div>
            <textarea
              name="specialNotes"
              value={formData.specialNotes}
              onChange={handleFormChange}
              placeholder="Special notes (optional)"
              rows={2}
              className="tapqdocs-modal-span2 tapqdocs-modal-textarea"
            />
          </div>

          <div className="tapqdocs-modal-section-title">Items</div>
          {items.map((item) => {
            // NEW — per-line GST Amt, computed the same way as the main
            // create form's item table (qty * price * gst.rate / 100).
            // `gst` here is the value already returned by calculateTotals()
            // below in this component (in scope via closure).
            const q = parseFloat(item.qty) || 0;
            const p = parseFloat(item.price) || 0;
            const lineTaxable = q * p;
            const lineGst = (lineTaxable * gst.rate) / 100;
            return (
              <div key={item.id} className="tapqdocs-modal-item-row">
                <input
                  className="tapqdocs-modal-item-desc"
                  placeholder="Description"
                  value={item.desc}
                  onChange={(e) => handleItemChange(item.id, "desc", e.target.value)}
                />
                <select
                  value={item.codeType || "HSN"}
                  onChange={(e) => handleItemChange(item.id, "codeType", e.target.value)}
                >
                  <option value="HSN">HSN</option>
                  <option value="SAC">SAC</option>
                </select>
                <input
                  className="tapqdocs-modal-item-code"
                  placeholder="Code"
                  value={item.hsn}
                  onChange={(e) => handleItemChange(item.id, "hsn", e.target.value)}
                />
                <input
                  className="tapqdocs-modal-item-qty"
                  type="number"
                  placeholder="Qty"
                  value={item.qty}
                  onChange={(e) => handleItemChange(item.id, "qty", e.target.value)}
                />
                <input
                  className="tapqdocs-modal-item-price"
                  type="number"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => handleItemChange(item.id, "price", e.target.value)}
                />
                {/* NEW — read-only GST Amt for this line, same as the
                    "GST Amt" column shown in the main create form. */}
                <span
                  className="tapqdocs-modal-item-gstamt"
                  title="GST amount for this line"
                >
                  {lineGst.toFixed(2)}
                </span>
                <button
                  className="tapqdocs-modal-remove-btn"
                  onClick={() => handleRemoveItem(item.id)}
                  title="Remove item"
                >
                  ×
                </button>
              </div>
            );
          })}
          <button className="tapqdocs-modal-add-btn" onClick={handleAddItem}>
            + Add Item
          </button>

          {/* NEW — editable GST % inputs, same as the main create form's
              IGST / CGST+SGST rate row. gstRates was already loaded from
              the saved document but had no UI to change it here before. */}
          {formData.gstType === "igst" && (
            <div className="tapqdocs-modal-gst-row">
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
            <div className="tapqdocs-modal-gst-row">
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

          <div className="tapqdocs-modal-section-title">Round Off</div>
          {roundOffs.map((ro) => (
            <div key={ro.id} className="tapqdocs-modal-roundoff-row">
              {/* NEW — editable label per round-off row. Placeholder shows
                  the default "Round off" text; leaving it blank keeps that
                  default everywhere (display, saved data, PDF). */}
              <input
                type="text"
                className="tapqdocs-modal-roundoff-label"
                placeholder="Round off"
                maxLength={40}
                value={ro.label}
                onChange={(e) => handleRoundOffChange(ro.id, "label", e.target.value)}
              />
              <button
                className="tapqdocs-modal-sign-btn"
                onClick={() => handleToggleRoundOffSign(ro.id)}
                title="Toggle sign"
              >
                {ro.sign}
              </button>
              <input
                type="number"
                placeholder="0.00"
                value={ro.amount}
                onChange={(e) => handleRoundOffChange(ro.id, "amount", e.target.value)}
              />
              <button
                className="tapqdocs-modal-remove-btn"
                onClick={() => handleRemoveRoundOff(ro.id)}
                title="Remove round off"
              >
                ×
              </button>
            </div>
          ))}
          <button className="tapqdocs-modal-add-btn" onClick={handleAddRoundOff}>
            + Add Round Off
          </button>

          <label className="tapqdocs-modal-checkbox-label">
            <input
              type="checkbox"
              checked={noSignature}
              onChange={(e) => setNoSignature(e.target.checked)}
            />
            No Signature (leave blank for manual signing)
          </label>

          {/* NEW — Terms & Conditions editor. PDF-only: edits here are
              used purely to regenerate this PDF and are never saved to
              the database record. Format: a heading line, then its
              bullet lines, with a blank line separating each section
              (matches the structure already used in the PDF). */}
          <div className="tapqdocs-modal-section-title">
            Terms &amp; Conditions{" "}
            <span style={{ fontWeight: 400, fontSize: "0.85em" }}>
              (PDF only — not saved to database)
            </span>
          </div>
          <textarea
            className="tapqdocs-modal-terms-textarea"
            rows={10}
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
            placeholder={
              "1. Heading\n1. First bullet\n2. Second bullet\n\n2. Next Heading\n1. Bullet..."
            }
          />

          <div className="tapqdocs-modal-total-row">
            <span>Final Total</span>
            <span>Rs. {(totalRoundOff !== 0 ? balancePayable : total).toFixed(2)}</span>
          </div>
        </div>

        <div className="tapqdocs-modal-footer">
          <button className="tapqdocs-modal-cancel-btn" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button
            className="tapqdocs-modal-save-btn"
            onClick={handleSave}
            disabled={isSaving || !formValid}
          >
            {isSaving ? "⏳ Saving..." : "✓ Save & Regenerate PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TapqDocs() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [rawDocuments, setRawDocuments] = useState({}); // { taxInvoices: [...], ... }
  const [totalCount, setTotalCount] = useState(0);

  const [docTypeFilter, setDocTypeFilter] = useState("ALL"); // "ALL" or a DOC_TYPE_CONFIG.value
  const [searchTerm, setSearchTerm] = useState("");

  // ── CHUNKED RENDERING ───────────────────────────────────────────────
  // All documents are fetched in one request (backend doesn't paginate),
  // but we only render a small batch into the DOM at a time so the page
  // stays fast even with hundreds of saved documents. "Load More" reveals
  // the next chunk of already-fetched, already-filtered results.
  const PAGE_SIZE = 25;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Tracks which specific document is currently being regenerated, so we
  // can show a per-row loading state instead of blocking the whole page.
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [regenerateError, setRegenerateError] = useState(null);

  // Tracks which document (if any) is currently open in the Edit modal.
  const [editingDoc, setEditingDoc] = useState(null);

  // NEW — Tracks which specific Tax Invoice row currently has a "mark
  // payment received" request in flight, so only that row's button shows
  // a loading state instead of blocking the whole table.
  const [markingPaidId, setMarkingPaidId] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  const qrCanvasRef = useRef(null);

  // ── FETCH ALL DOCUMENTS ───────────────────────────────────────────────
  const fetchAllDocuments = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tapq/get-all-documents`,
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load documents");
      }

      setRawDocuments(data.data?.documents || {});
      setTotalCount(data.data?.totalCount || 0);
      setVisibleCount(PAGE_SIZE);
    } catch (err) {
      console.error("Failed to fetch tapq documents:", err);
      setLoadError(err.message || "Something went wrong while loading documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDocuments();
  }, []);

  // ── FLATTEN INTO A SINGLE LIST WITH A TAG FOR WHICH TYPE IT IS ─────────
  const allDocsFlat = useMemo(() => {
    const flat = [];
    DOC_TYPE_CONFIG.forEach((cfg) => {
      const list = rawDocuments[cfg.value];
      if (Array.isArray(list)) {
        list.forEach((doc) => {
          flat.push({ ...doc, __collectionKey: cfg.value, __cfg: cfg });
        });
      }
    });
    // Most recently created first
    flat.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return flat;
  }, [rawDocuments]);

  // ── APPLY DROPDOWN + SEARCH FILTERS ────────────────────────────────────
  const filteredDocs = useMemo(() => {
    let list = allDocsFlat;

    if (docTypeFilter !== "ALL") {
      list = list.filter((doc) => doc.__collectionKey === docTypeFilter);
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((doc) => {
        const name = (doc.customer?.name || "").toLowerCase();
        const email = (doc.customer?.email || "").toLowerCase();
        const phone = (doc.customer?.phone || "").toLowerCase();
        const invoiceNum = (doc.document?.invoiceNum || "").toLowerCase();
        const documentId = (doc.documentId || "").toLowerCase();
        return (
          name.includes(term) ||
          email.includes(term) ||
          phone.includes(term) ||
          invoiceNum.includes(term) ||
          documentId.includes(term)
        );
      });
    }

    return list;
  }, [allDocsFlat, docTypeFilter, searchTerm]);

  // Whenever the filter or search term changes, snap back to the first
  // chunk — otherwise a previously-expanded count could carry over and
  // either show too many/too few rows for the new result set.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [docTypeFilter, searchTerm]);

  // Only the current chunk is actually rendered into the DOM.
  const visibleDocs = filteredDocs.slice(0, visibleCount);
  const hasMore = visibleCount < filteredDocs.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  // ── REGENERATE PDF FOR A SAVED DOCUMENT ────────────────────────────────
  // Reconstructs the exact shape generatePDF() expects from a saved
  // document record, then calls it — same renderer used when the
  // document was first created, so the regenerated PDF matches exactly.
  const handleRegeneratePDF = async (doc) => {
    setRegeneratingId(doc.documentId);
    setRegenerateError(null);

    try {
      const cfg = doc.__cfg;

      const formData = {
        custName: doc.customer?.name || "",
        custPhone: doc.customer?.phone || "",
        custAddress: doc.customer?.address || "",
        custEmail: doc.customer?.email || "",
        custState: doc.customer?.state || "",
        invoiceNum: doc.document?.invoiceNum || "",
        // Kept consistent with the Edit modal fix: use the ORIGINAL saved
        // date for regeneration too, instead of letting it default to
        // today's date.
        invoiceDate: doc.document?.invoiceDate || "",
        docType: cfg ? cfg.docType : doc.document?.docType || "TAX INVOICE",
        gstType: doc.document?.gstType || "igst",
      };

      const gstRates = {
        igstRate: doc.gstRates?.igstRate ?? 18,
        cgstRate: doc.gstRates?.cgstRate ?? 9,
        sgstRate: doc.gstRates?.sgstRate ?? 9,
      };

      // codeType is what tells the PDF header whether to print "HSN Code",
      // "SAC Code", or "HSN/SAC Code" (see getCodeColumnLabel in
      // AdminTapqPdf.js). This field was previously dropped here, so every
      // regenerated PDF fell back to the "HSN" default no matter what the
      // item was originally saved as — that's what's fixed below.
      const items = (doc.items || []).map((item) => ({
        desc: item.desc || "",
        hsn: item.hsn || "",
        codeType: item.codeType || "HSN",
        qty: item.qty || 0,
        price: item.price || 0,
      }));

      const dueDate = doc.document?.dueDate || "";

      // FIXED — this was only ever reading doc.appliedAdvances (the old,
      // pre-rename field), so any document saved under the current
      // appliedRoundOffs system was silently treated as having zero
      // round-offs. Read appliedRoundOffs first, falling back to
      // appliedAdvances only for legacy records saved before the rename.
      // Each entry's custom `label` is carried through too (defaults to ""
      // -> "Round off" via getRoundOffLabel() inside generatePDF).
      const savedRoundOffs = doc.appliedRoundOffs || doc.appliedAdvances || [];
      const roundOffEntries = savedRoundOffs.map((ro, idx) => ({
        id: idx,
        amount: ro.amount,
        sign: ro.sign === "-" ? "-" : "+",
        label: ro.label || "",
        applied: true,
      }));

      const totals = calculateTotals(
        items,
        formData.gstType,
        gstRates,
        roundOffEntries,
      );

      // Build the UPI QR for whatever's actually owed on this document.
      const amountForQR =
        totals.totalRoundOff !== 0 ? totals.balancePayable : totals.total;

      const [qrData, sigImg] = await Promise.all([
        generateQR(
          "upi://pay?pa=9483914542@kotak811&pn=MohammedAdilBetageri&am=" +
            amountForQR.toFixed(2) +
            "&cu=INR",
          qrCanvasRef,
        ),
        getSignatureDataURL(),
      ]);

      // FIXED — pass totalRoundOff/appliedRoundOffs (what generatePDF
      // actually reads), instead of the old totalAdvance/appliedAdvances
      // names which generatePDF doesn't look for at all.
      await generatePDF({
        formData,
        items,
        gstRates,
        dueDate,
        totalRoundOff: totals.totalRoundOff,
        balancePayable: totals.balancePayable,
        total: totals.total,
        taxable: totals.taxable,
        gstTotal: totals.gstTotal,
        qrData,
        sigImg,
        appliedRoundOffs: totals.appliedRoundOffs,
      });
    } catch (err) {
      console.error("Failed to regenerate PDF:", err);
      setRegenerateError(
        `Could not regenerate PDF for ${doc.document?.invoiceNum || doc.documentId}: ${err.message || "Unknown error"}`,
      );
    } finally {
      setRegeneratingId(null);
    }
  };

  // ── SAVE HANDLER FOR THE EDIT MODAL ────────────────────────────────────
  // Patches the edited document back into local state so the table
  // reflects the change immediately, without needing a full refetch.
  const handleDocSaved = (updatedRecord) => {
    setRawDocuments((prev) => {
      const key = editingDoc.__collectionKey;
      const list = prev[key] || [];
      return {
        ...prev,
        [key]: list.map((d) =>
          d.documentId === editingDoc.documentId
            ? { ...updatedRecord, documentId: editingDoc.documentId }
            : d,
        ),
      };
    });
    setEditingDoc(null);
  };

  // ── TOGGLE PAYMENT RECEIVED FOR A TAX INVOICE ──────────────────────────
  // Only relevant for Tax Invoices. Uses the dedicated mark-payment
  // endpoint (touches only the paymentReceived flag in the database),
  // then patches local state so the toggle flips immediately without a
  // full refetch. Two-way — `nextValue` lets the same handler both mark
  // AND undo (unmark) payment received.
  const handleTogglePaymentReceived = async (doc, nextValue) => {
    setMarkingPaidId(doc.documentId);
    setPaymentError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tapq/mark-payment/${doc.documentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentReceived: nextValue }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update payment status");
      }

      setRawDocuments((prev) => {
        const key = doc.__collectionKey;
        const list = prev[key] || [];
        return {
          ...prev,
          [key]: list.map((d) =>
            d.documentId === doc.documentId
              ? {
                  ...d,
                  document: { ...d.document, paymentReceived: nextValue },
                }
              : d,
          ),
        };
      });
    } catch (err) {
      console.error("Failed to update payment status:", err);
      setPaymentError(
        `Could not update payment status for ${doc.document?.invoiceNum || doc.documentId}: ${err.message || "Unknown error"}`,
      );
    } finally {
      setMarkingPaidId(null);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="tapqdocs-admin">
      <header className="tapqdocs-header">
        <div>
          <h1>DIMENSIFY3D — TAPQ Documents</h1>
          <p>Browse, search, and regenerate previously created TAPQ docs</p>
        </div>
        <div className="tapqdocs-header-actions">
          <button
            className="tapqdocs-btn-new"
            onClick={() => navigate("/admintapq")}
            title="Create a new document"
          >
            + New Document
          </button>
          <button
            className="tapqdocs-btn-refresh"
            onClick={fetchAllDocuments}
            title="Reload documents from the database"
            disabled={loading}
          >
            {loading ? "⏳ Loading..." : "⟳ Refresh"}
          </button>
        </div>
      </header>

      <div className="tapqdocs-container">
        {/* Filters */}
        <div className="tapqdocs-filters-card">
          <div className="tapqdocs-filter-group">
            <label>Document Type</label>
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types ({totalCount})</option>
              {DOC_TYPE_CONFIG.map((cfg) => (
                <option key={cfg.value} value={cfg.value}>
                  {cfg.label} ({(rawDocuments[cfg.value] || []).length})
                </option>
              ))}
            </select>
          </div>

          <div className="tapqdocs-filter-group tapqdocs-search-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by customer name, invoice/doc number, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Errors */}
        {loadError && (
          <div className="tapqdocs-error-banner">
            ⚠ {loadError}
            <button onClick={fetchAllDocuments}>Retry</button>
          </div>
        )}
        {regenerateError && (
          <div className="tapqdocs-error-banner">
            ⚠ {regenerateError}
            <button onClick={() => setRegenerateError(null)}>Dismiss</button>
          </div>
        )}
        {paymentError && (
          <div className="tapqdocs-error-banner">
            ⚠ {paymentError}
            <button onClick={() => setPaymentError(null)}>Dismiss</button>
          </div>
        )}

        {/* Loading state */}
        {loading && !loadError && (
          <div className="tapqdocs-loading-state">Loading documents…</div>
        )}

        {/* Empty state */}
        {!loading && !loadError && filteredDocs.length === 0 && (
          <div className="tapqdocs-empty-state">
            {allDocsFlat.length === 0
              ? "No documents have been saved yet."
              : "No documents match your filters."}
          </div>
        )}

        {/* Results table */}
        {!loading && !loadError && filteredDocs.length > 0 && (
          <>
            <div className="tapqdocs-results-meta">
              Showing {visibleDocs.length} of {filteredDocs.length} document
              {filteredDocs.length === 1 ? "" : "s"}
            </div>

            <div className="tapqdocs-table-card">
              <div className="tapqdocs-table-header">
                <span>Type</span>
                <span>Doc Number</span>
                <span>Customer</span>
                <span>Contact</span>
                <span>Date</span>
                <span>Total</span>
                <span></span>
              </div>
              <div className="tapqdocs-table-body">
                {visibleDocs.map((doc) => {
                  const cfg = doc.__cfg;
                  const isRegenerating = regeneratingId === doc.documentId;
                  const isTaxInvoice = doc.__collectionKey === "taxInvoices";
                  const isPaid = doc.document?.paymentReceived === true;
                  const isMarkingPaid = markingPaidId === doc.documentId;
                  return (
                    <div key={doc.documentId} className="tapqdocs-table-row">
                      <span>
                        <span
                          className={`tapqdocs-type-badge tapqdocs-type-badge--${doc.__collectionKey}`}
                        >
                          {cfg ? cfg.label.replace(/s$/, "") : doc.__collectionKey}
                        </span>
                      </span>
                      <span className="tapqdocs-invoice-num-cell">
                        {isTaxInvoice && isPaid && (
                          <span className="tapqdocs-paid-flag">✓ PAID</span>
                        )}
                        <span className="tapqdocs-invoice-num">
                          {doc.document?.invoiceNum || "—"}
                        </span>
                      </span>
                      <span className="tapqdocs-cust-cell">
                        <span className="tapqdocs-cust-name">
                          {doc.customer?.name || "—"}
                        </span>
                        {doc.customer?.email && (
                          <span className="tapqdocs-cust-sub">
                            {doc.customer.email}
                          </span>
                        )}
                      </span>
                      <span className="tapqdocs-cust-sub">
                        {doc.customer?.phone || "—"}
                      </span>
                      <span className="tapqdocs-date-cell">
                        {doc.document?.invoiceDate ||
                          formatTimestamp(doc.createdAt)}
                      </span>
                      <span className="tapqdocs-total-cell">
                        {doc.totals?.total != null
                          ? `Rs. ${Number(doc.totals.total).toFixed(2)}`
                          : "—"}
                      </span>
                      <span className="tapqdocs-actions-cell">
                        {/* NEW — small toggle switch, shown only for Tax
                            Invoice rows, placed to the left of Edit /
                            Regenerate. Two-way: flipping it on marks the
                            invoice paid, flipping it back off undoes it —
                            both persist via the update-document endpoint.
                            The "✓ PAID" flag itself is shown above the
                            invoice number in the Doc Number column, not
                            here. */}
                        {isTaxInvoice && (
                          <label
                            className={`tapqdocs-paid-toggle ${isMarkingPaid ? "tapqdocs-paid-toggle--busy" : ""}`}
                            title={isPaid ? "Undo payment received" : "Mark payment received"}
                          >
                            <input
                              type="checkbox"
                              checked={isPaid}
                              disabled={isMarkingPaid}
                              onChange={(e) =>
                                handleTogglePaymentReceived(doc, e.target.checked)
                              }
                            />
                            <span className="tapqdocs-paid-toggle-track">
                              <span className="tapqdocs-paid-toggle-thumb" />
                            </span>
                            <span className="tapqdocs-paid-toggle-label">
                              {isPaid ? "Paid Payment" : "Payment Pending"}
                            </span>
                          </label>
                        )}
                        <button
                          className="tapqdocs-btn-edit"
                          onClick={() => setEditingDoc(doc)}
                          title="Edit this document"
                        >
                          ✎ Edit
                        </button>
                        <button
                          className="tapqdocs-btn-regenerate"
                          onClick={() => handleRegeneratePDF(doc)}
                          disabled={isRegenerating}
                          title="Regenerate and download this document's PDF"
                        >
                          {isRegenerating ? "⏳ Generating..." : "⬇ Regenerate PDF"}
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {hasMore && (
              <div className="tapqdocs-load-more-wrapper">
                <button
                  className="tapqdocs-btn-load-more"
                  onClick={handleLoadMore}
                >
                  Load More ({filteredDocs.length - visibleDocs.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {editingDoc && (
        <EditDocumentModal
          doc={editingDoc}
          qrCanvasRef={qrCanvasRef}
          onCancel={() => setEditingDoc(null)}
          onSaved={handleDocSaved}
        />
      )}

      <div
        id="tapqdocs-qr-hidden"
        ref={qrCanvasRef}
        style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
      ></div>
    </div>
  );
}