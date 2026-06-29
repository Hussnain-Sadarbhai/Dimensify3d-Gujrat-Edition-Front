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
        docType: cfg ? cfg.docType : doc.document?.docType || "TAX INVOICE",
        gstType: doc.document?.gstType || "igst",
      };

      const gstRates = {
        igstRate: doc.gstRates?.igstRate ?? 18,
        cgstRate: doc.gstRates?.cgstRate ?? 9,
        sgstRate: doc.gstRates?.sgstRate ?? 9,
      };

      const items = (doc.items || []).map((item) => ({
        desc: item.desc || "",
        hsn: item.hsn || "",
        qty: item.qty || 0,
        price: item.price || 0,
      }));

      const dueDate = doc.document?.dueDate || "";

      const appliedAdvances = (doc.appliedAdvances || []).map((adv, idx) => ({
        id: idx,
        advId: adv.advId || "",
        amount: adv.amount,
        applied: true,
      }));

      const totals = calculateTotals(
        items,
        formData.gstType,
        gstRates,
        appliedAdvances,
      );

      // Build the UPI QR for whatever's actually owed on this document.
      const amountForQR =
        totals.totalAdvance > 0 ? totals.balancePayable : totals.total;

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
        totalAdvance: totals.totalAdvance,
        balancePayable: totals.balancePayable,
        total: totals.total,
        taxable: totals.taxable,
        gstTotal: totals.gstTotal,
        qrData,
        sigImg,
        appliedAdvances: totals.appliedAdvances,
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
                  return (
                    <div key={doc.documentId} className="tapqdocs-table-row">
                      <span>
                        <span
                          className={`tapqdocs-type-badge tapqdocs-type-badge--${doc.__collectionKey}`}
                        >
                          {cfg ? cfg.label.replace(/s$/, "") : doc.__collectionKey}
                        </span>
                      </span>
                      <span className="tapqdocs-invoice-num">
                        {doc.document?.invoiceNum || "—"}
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
                      <span>
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

      <div
        id="tapqdocs-qr-hidden"
        ref={qrCanvasRef}
        style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
      ></div>
    </div>
  );
}