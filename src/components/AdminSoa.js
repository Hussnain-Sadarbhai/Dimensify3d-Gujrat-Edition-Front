import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Plus, X, Save, FileText, Printer } from 'lucide-react';
import './AdminSoa.css';
// Import the PDF functions
import AdminSoaPdf, { 
  generatePDF, 
  generatePDFWithProgress, 
  generatePDFWithCustomFilename,
  previewPDF 
} from './AdminSoaPdf';

export default function AdminSoa() {
  const [activeTab, setActiveTab] = useState('form');
  const [saveStatus, setSaveStatus] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const paperRef = useRef(null);
  const rowSeq = useRef(1);

  // Default state
  const getDefaultState = () => ({
    profile: {
      companyName: '',
      address: '',
      phone: '',
      email: '',
      gstin: '',
      bankName: '',
      accountName: '',
      accountNumber: '',
      ifsc: '',
      branch: '',
      upi: ''
    },
    client: { name: '', address: '' },
    meta: {
      soaNumber: `SOA-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-01`,
      statementDate: new Date().toISOString().slice(0,10),
      periodFrom: '',
      periodTo: '',
      currency: '₹'
    },
    rows: [],
    notes: 'Thank you for your business. This statement reflects the advance payment received and the balance currently outstanding as of the statement date above.'
  });

  const [state, setState] = useState(getDefaultState);

  // Load draft from localStorage on mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        const saved = localStorage.getItem('soa_draft');
        if (saved) {
          const parsed = JSON.parse(saved);
          const defaultState = getDefaultState();
          setState({
            ...defaultState,
            ...parsed,
            profile: { ...defaultState.profile, ...(parsed.profile || {}) },
            meta: { ...defaultState.meta, ...(parsed.meta || {}) },
            client: { ...defaultState.client, ...(parsed.client || {}) },
            rows: parsed.rows || []
          });
          if (parsed.rows) {
            parsed.rows.forEach(r => {
              const n = parseInt((r.id || 'r0').slice(1));
              if (n >= rowSeq.current) rowSeq.current = n + 1;
            });
          }
        }
      } catch (e) {
        console.error('Failed to load draft', e);
      }
    };
    loadDraft();
  }, []);

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem('soa_draft', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save draft', e);
    }
  }, [state]);

  // Auto-save on state change
  useEffect(() => {
    const timer = setTimeout(saveDraft, 600);
    return () => clearTimeout(timer);
  }, [state, saveDraft]);

  // Helper to get nested value
  const getDeep = (obj, path) => {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  };

  // Helper to set nested value
  const setDeep = (obj, path, value) => {
    const keys = path.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = value;
  };

  // Handle form field changes
  const handleFieldChange = (path, value) => {
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      setDeep(newState, path, value);
      return newState;
    });
  };

  // Transaction row operations
  const addRow = (prefill = {}) => {
    const row = {
      id: 'r' + rowSeq.current++,
      date: new Date().toISOString().slice(0, 10),
      description: '',
      dr: '',
      cr: '',
      advance: false,
      ...prefill
    };
    setState(prev => ({ ...prev, rows: [...prev.rows, row] }));
  };

  const removeRow = (id) => {
    setState(prev => ({
      ...prev,
      rows: prev.rows.filter(r => r.id !== id)
    }));
  };

  const updateRow = (id, field, value) => {
    setState(prev => ({
      ...prev,
      rows: prev.rows.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  };

  // New statement - clears ALL fields including business profile
  const handleNewStatement = () => {
    if (!window.confirm('Start a brand new statement? All current data will be cleared.')) return;
    const newState = JSON.parse(JSON.stringify(getDefaultState()));
    newState.meta.soaNumber = `SOA-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-01`;
    setState(newState);
    rowSeq.current = 1;
    localStorage.removeItem('soa_draft');
  };

  // Save profile explicitly
  const handleSaveProfile = () => {
    saveDraft();
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 1800);
  };

  // Updated PDF download handler using the extracted function
  const downloadPDF = async () => {
    const btn = document.getElementById('soaDownloadPdfBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Generating PDF…';
    btn.disabled = true;
    setIsGeneratingPDF(true);

    try {
      await generatePDF(state, paperRef);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert(err.message || 'Could not generate the PDF. Please try again.');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
      setIsGeneratingPDF(false);
    }
  };

  // PDF download with progress tracking
  const downloadPDFWithProgress = async () => {
    const btn = document.getElementById('soaDownloadPdfBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Generating PDF…';
    btn.disabled = true;
    setIsGeneratingPDF(true);
    setPdfProgress(0);

    try {
      await generatePDFWithProgress(
        state, 
        paperRef,
        (progress, message) => {
          setPdfProgress(progress);
          btn.textContent = `Generating ${progress}%…`;
        },
        (error) => {
          console.error('PDF generation error:', error);
          alert(error.message || 'Failed to generate PDF');
        }
      );
    } catch (err) {
      console.error('PDF generation failed', err);
      alert(err.message || 'Could not generate the PDF. Please try again.');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
      setIsGeneratingPDF(false);
      setPdfProgress(0);
    }
  };

  // PDF download with custom filename
  const downloadPDFWithCustomName = async () => {
    const customName = prompt('Enter filename:', state.meta.soaNumber || 'statement');
    if (!customName) return;

    const btn = document.getElementById('soaDownloadPdfBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Generating PDF…';
    btn.disabled = true;
    setIsGeneratingPDF(true);

    try {
      await generatePDFWithCustomFilename(state, paperRef, customName);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert(err.message || 'Could not generate the PDF. Please try again.');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
      setIsGeneratingPDF(false);
    }
  };

  // PDF preview handler
  const handlePreviewPDF = async () => {
    const btn = document.getElementById('soaPreviewPdfBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Loading Preview…';
    btn.disabled = true;

    try {
      const newWindow = await previewPDF(state, paperRef);
      if (!newWindow) {
        alert('Preview window was blocked. Please allow popups for this site.');
      }
    } catch (err) {
      console.error('PDF preview failed', err);
      alert(err.message || 'Could not preview the PDF.');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Utility functions for rendering
  const escapeHtml = (s) => {
    return (s || '').toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  const fmt = (n) => {
    const num = parseFloat(n) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d + 'T00:00:00');
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const todayISO = () => new Date().toISOString().slice(0, 10);

  // Render the statement document
  const renderDoc = () => {
    const cur = state.meta.currency || '₹';
    const companyName = state.profile.companyName || 'Your Business Name';
    const clientName = state.client.name || 'Client Name';

    let totalDr = 0, totalCr = 0, running = 0;
    
    const rowsHtml = state.rows.length ? state.rows.map(r => {
      const dr = parseFloat(r.dr) || 0;
      const cr = parseFloat(r.cr) || 0;
      totalDr += dr;
      totalCr += cr;
      running += (dr - cr);
      const tag = cr > 0 ? '<span class="soa-tag">Payment received</span>' : '';
      return `
        <tr>
          <td>${fmtDate(r.date)}</td>
          <td class="soa-desc-cell">${escapeHtml(r.description) || '<span style="color:#9aa6ad">—</span>'}${tag}</td>
          <td class="soa-num">${dr > 0 ? cur + ' ' + fmt(dr) : '—'}</td>
          <td class="soa-num">${cr > 0 ? cur + ' ' + fmt(cr) : '—'}</td>
          <td class="soa-num">${cur} ${fmt(running)}</td>
        </tr>`;
    }).join('') : '<tr><td colspan="5" class="soa-doc-table-empty">No transactions added yet.</td></tr>';

    const closing = totalDr - totalCr;
    const closingHtml = closing > 0
      ? `<div class="soa-summary-line soa-total soa-due"><span>Balance due</span><span class="soa-v">${cur} ${fmt(closing)}</span></div>`
      : `<div class="soa-summary-line soa-total soa-advance"><span>Advance balance carried forward</span><span class="soa-v">${cur} ${fmt(Math.abs(closing))}</span></div>`;

    const sealHtml = totalCr > 0 ? `
      <svg className="soa-seal" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs><path id="sealCurve" d="M 100,100 m -74,0 a 74,74 0 1,1 148,0 a 74,74 0 1,1 -148,0" /></defs>
        <circle cx="100" cy="100" r="92" fill="none" stroke="#92742f" stroke-width="2"/>
        <circle cx="100" cy="100" r="80" fill="none" stroke="#92742f" stroke-width="1" stroke-dasharray="2 4"/>
        <text font-size="10.5" letter-spacing="2.5" fill="#92742f" font-family="Inter, sans-serif" font-weight="700">
          <textPath href="#sealCurve" startOffset="1%">PAYMENT RECEIVED • PAYMENT RECEIVED •</textPath>
        </text>
        <text x="100" y="96" text-anchor="middle" font-size="17" fill="#92742f" font-family="'IBM Plex Mono', monospace" font-weight="600">${cur} ${fmt(totalCr)}</text>
        <text x="100" y="114" text-anchor="middle" font-size="9" letter-spacing="1.5" fill="#5b6b7a" font-family="Inter, sans-serif">AS OF ${fmtDate(state.meta.statementDate).toUpperCase()}</text>
      </svg>` : '';

    const showBank = state.profile.bankName || state.profile.accountNumber || state.profile.ifsc;
    const balanceDue = closing > 0 ? closing : 0;
    const showQR = balanceDue > 0 && !!state.profile.upi;
    
    const qrHtml = showQR ? `
      <div className="soa-qr-block">
        <div className="soa-qr-img-wrap" id="qrCodeBox">
          <QRCodeSVG 
            value={'upi://pay?pa=' + encodeURIComponent(state.profile.upi) + '&pn=' + encodeURIComponent(companyName) + '&am=' + balanceDue.toFixed(2) + '&cu=INR&tn=' + encodeURIComponent('Balance for ' + (state.meta.soaNumber || 'statement'))}
            size={72}
            bgColor="#ffffff"
            fgColor="#1c2b3a"
            level="M"
          />
        </div>
        <div className="soa-qr-caption">Scan to pay via UPI<b>${cur} ${fmt(balanceDue)}</b></div>
      </div>` : '';
      
    const payHtml = showBank ? `
      <div className="soa-pay-box">
        <div className="soa-pay-left">
          <div className="soa-label">Please remit any balance to</div>
          <div className="soa-pay-grid">
            <div className="soa-pay-item">Bank<b>${escapeHtml(state.profile.bankName) || '—'}</b></div>
            <div className="soa-pay-item">Account holder<b>${escapeHtml(state.profile.accountName) || '—'}</b></div>
            <div className="soa-pay-item">Account number<b>${escapeHtml(state.profile.accountNumber) || '—'}</b></div>
            <div className="soa-pay-item">IFSC / SWIFT<b>${escapeHtml(state.profile.ifsc) || '—'}</b></div>
            <div className="soa-pay-item">Branch<b>${escapeHtml(state.profile.branch) || '—'}</b></div>
          </div>
        </div>
        ${qrHtml}
      </div>` : '';

    const periodHtml = (state.meta.periodFrom || state.meta.periodTo)
      ? `<div className="soa-doc-meta-line">Period: <b>${fmtDate(state.meta.periodFrom)} – ${fmtDate(state.meta.periodTo)}</b></div>` : '';

    return (
      <div className="soa-doc-body">
        <div className="soa-doc-head">
          <div>
            <div className="soa-doc-co-name">{escapeHtml(companyName)}</div>
            <div className="soa-doc-co-meta" dangerouslySetInnerHTML={{
              __html: escapeHtml(state.profile.address) + (state.profile.address ? '<br>' : '') +
                [state.profile.phone, state.profile.email].filter(Boolean).map(escapeHtml).join(' &nbsp;·&nbsp; ') +
                (state.profile.gstin ? '<br>GSTIN: ' + escapeHtml(state.profile.gstin) : '')
            }} />
          </div>
          <div className="soa-doc-title-box">
            <div className="soa-doc-title">STATEMENT OF ACCOUNT</div>
            <div className="soa-doc-meta-line">No. <b>{escapeHtml(state.meta.soaNumber)}</b></div>
            <div className="soa-doc-meta-line">Date: <b>{fmtDate(state.meta.statementDate)}</b></div>
            <div dangerouslySetInnerHTML={{ __html: periodHtml }} />
          </div>
        </div>

        <div className="soa-doc-billto">
          <div className="soa-label">Statement for</div>
          <div className="soa-name">{escapeHtml(clientName)}</div>
          <div className="soa-addr">{escapeHtml(state.client.address)}</div>
        </div>

        <table className="soa-doc-table">
          <thead>
            <tr><th>Date</th><th>Particulars</th><th className="soa-num">Invoiced</th><th className="soa-num">Received</th><th className="soa-num">Balance</th></tr>
          </thead>
          <tbody dangerouslySetInnerHTML={{ __html: rowsHtml }} />
        </table>

        <div className="soa-summary-wrap">
          <div dangerouslySetInnerHTML={{ __html: sealHtml }} />
          <div className="soa-summary-box">
            <div className="soa-summary-line"><span>Total invoiced</span><span className="soa-v">{cur} {fmt(totalDr)}</span></div>
            <div className="soa-summary-line"><span>Total received</span><span className="soa-v">{cur} {fmt(totalCr)}</span></div>
            <div dangerouslySetInnerHTML={{ __html: closingHtml }} />
          </div>
        </div>

        <div dangerouslySetInnerHTML={{ __html: payHtml }} />

        {state.notes && <div className="soa-doc-notes">{escapeHtml(state.notes)}</div>}

        <div className="soa-doc-footer">
          <div className="soa-printed-note">Generated on {fmtDate(todayISO())}</div>
          <div className="soa-sign-block">
            <div className="soa-sign-line"></div>
            <div className="soa-sign-label">For {escapeHtml(companyName)} — Authorized Signatory</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="soa-container">
      {/* Top Bar */}
      <div className="soa-topbar">
        <div className="soa-brand">
          <span className="soa-brand-mark">SOA</span>
          <span style={{color:"#fff"}}>Statement Generator</span>
        </div>
        <div className="soa-mobile-tabs">
          <button 
            className={`soa-tab-btn ${activeTab === 'form' ? 'soa-active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            Edit
          </button>
          <button 
            className={`soa-tab-btn ${activeTab === 'preview' ? 'soa-active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
        </div>
        <div className="soa-topbar-actions">
          <button className="soa-btn soa-btn-ghost" onClick={handleNewStatement}>
            <FileText size={16} /> New
          </button>
          <button 
            id="soaDownloadPdfBtn"
            className="soa-btn soa-btn-primary"
            onClick={downloadPDF}
            disabled={isGeneratingPDF}
          >
            <Download size={16} /> {isGeneratingPDF ? `Generating ${pdfProgress}%` : 'PDF'}
          </button>
          <button 
            id="soaPreviewPdfBtn"
            className="soa-btn soa-btn-ghost"
            onClick={handlePreviewPDF}
          >
            <FileText size={16} /> Preview
          </button>
          <button className="soa-btn soa-btn-ghost" onClick={handlePrint}>
            <Printer size={16} />
          </button>
          {/* Optional: Additional PDF options dropdown */}
          <button 
            className="soa-btn soa-btn-ghost"
            onClick={downloadPDFWithCustomName}
            title="Download with custom filename"
          >
            <Save size={16} /> Save As
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="soa-layout">
        {/* Form Panel */}
        <div className={`soa-form-panel ${activeTab === 'form' ? 'soa-active-tab' : ''}`} id="soaFormPanel">
          {/* Business Profile */}
          <div className="soa-card">
            <h2>Your business</h2>
            <p className="soa-hint">Appears as the letterhead on every statement.</p>
            <div className="soa-field">
              <label>Business name</label>
              <input 
                value={state.profile.companyName}
                onChange={(e) => handleFieldChange('profile.companyName', e.target.value)}
                placeholder="Acme Studio Pvt. Ltd."
              />
            </div>
            <div className="soa-field">
              <label>Address</label>
              <textarea 
                value={state.profile.address}
                onChange={(e) => handleFieldChange('profile.address', e.target.value)}
                placeholder="12 MG Road, Indiranagar, Bengaluru, Karnataka 560038"
                rows={2}
              />
            </div>
            <div className="soa-row2">
              <div className="soa-field">
                <label>Phone</label>
                <input 
                  value={state.profile.phone}
                  onChange={(e) => handleFieldChange('profile.phone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="soa-field">
                <label>Email</label>
                <input 
                  value={state.profile.email}
                  onChange={(e) => handleFieldChange('profile.email', e.target.value)}
                  placeholder="hello@acmestudio.in"
                />
              </div>
            </div>
            <div className="soa-field">
              <label>GSTIN / Tax ID (optional)</label>
              <input 
                value={state.profile.gstin}
                onChange={(e) => handleFieldChange('profile.gstin', e.target.value)}
                placeholder="29ABCDE1234F1Z5"
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="soa-card">
            <h2>Bank details for payment</h2>
            <p className="soa-hint">Shown at the bottom of the statement so clients know where to pay any balance.</p>
            <div className="soa-field">
              <label>Bank name</label>
              <input 
                value={state.profile.bankName}
                onChange={(e) => handleFieldChange('profile.bankName', e.target.value)}
                placeholder="HDFC Bank"
              />
            </div>
            <div className="soa-field">
              <label>Account holder name</label>
              <input 
                value={state.profile.accountName}
                onChange={(e) => handleFieldChange('profile.accountName', e.target.value)}
                placeholder="Acme Studio Pvt. Ltd."
              />
            </div>
            <div className="soa-row2">
              <div className="soa-field">
                <label>Account number</label>
                <input 
                  value={state.profile.accountNumber}
                  onChange={(e) => handleFieldChange('profile.accountNumber', e.target.value)}
                  placeholder="50100123456789"
                />
              </div>
              <div className="soa-field">
                <label>IFSC / SWIFT code</label>
                <input 
                  value={state.profile.ifsc}
                  onChange={(e) => handleFieldChange('profile.ifsc', e.target.value)}
                  placeholder="HDFC0001234"
                />
              </div>
            </div>
            <div className="soa-field">
              <label>Branch</label>
              <input 
                value={state.profile.branch}
                onChange={(e) => handleFieldChange('profile.branch', e.target.value)}
                placeholder="Indiranagar, Bengaluru"
              />
            </div>
            <div className="soa-field">
              <label>UPI ID (optional — generates a scan-to-pay QR for the balance due)</label>
              <input 
                value={state.profile.upi}
                onChange={(e) => handleFieldChange('profile.upi', e.target.value)}
                placeholder="yourname@okhdfcbank"
              />
            </div>
            <div className="soa-save-row">
              <button className="soa-btn-link" onClick={handleSaveProfile}>
                <Save size={14} /> Save these as my defaults
              </button>
              <span className={`soa-save-status ${saveStatus ? 'soa-show' : ''}`}>Saved ✓</span>
            </div>
          </div>

          {/* Client */}
          <div className="soa-card">
            <h2>Bill to</h2>
            <div className="soa-field">
              <label>Client name</label>
              <input 
                value={state.client.name}
                onChange={(e) => handleFieldChange('client.name', e.target.value)}
                placeholder="Bluepeak Retail LLP"
              />
            </div>
            <div className="soa-field">
              <label>Client address</label>
              <textarea 
                value={state.client.address}
                onChange={(e) => handleFieldChange('client.address', e.target.value)}
                placeholder="44 Residency Road, Bengaluru"
                rows={2}
              />
            </div>
          </div>

          {/* Statement Details */}
          <div className="soa-card">
            <h2>Statement details</h2>
            <div className="soa-row2">
              <div className="soa-field">
                <label>Statement no.</label>
                <input 
                  value={state.meta.soaNumber}
                  onChange={(e) => handleFieldChange('meta.soaNumber', e.target.value)}
                />
              </div>
              <div className="soa-field">
                <label>Statement date</label>
                <input 
                  type="date"
                  value={state.meta.statementDate}
                  onChange={(e) => handleFieldChange('meta.statementDate', e.target.value)}
                />
              </div>
            </div>
            <div className="soa-row3">
              <div className="soa-field">
                <label>Period from</label>
                <input 
                  type="date"
                  value={state.meta.periodFrom}
                  onChange={(e) => handleFieldChange('meta.periodFrom', e.target.value)}
                />
              </div>
              <div className="soa-field">
                <label>Period to</label>
                <input 
                  type="date"
                  value={state.meta.periodTo}
                  onChange={(e) => handleFieldChange('meta.periodTo', e.target.value)}
                />
              </div>
              <div className="soa-field">
                <label>Currency symbol</label>
                <input 
                  value={state.meta.currency}
                  onChange={(e) => handleFieldChange('meta.currency', e.target.value)}
                  placeholder="₹"
                />
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="soa-card">
            <h2>Transactions</h2>
            <p className="soa-hint">
              Add each invoice under <b>Invoiced</b>. Add the advance payment(s) you've already received under <b>Received</b> — any row with a received amount gets tagged and rolled into the "payment received" stamp automatically.
            </p>
            <table className="soa-tx-table">
              <thead>
                <tr>
                  <th style={{width: '20%'}}>Date</th>
                  <th>Description</th>
                  <th style={{width: '16%'}}>Invoiced</th>
                  <th style={{width: '16%'}}>Received</th>
                  <th style={{width: '28px'}}></th>
                </tr>
              </thead>
              <tbody>
                {state.rows.length === 0 ? (
                  <tr><td colSpan="5"><div className="soa-tx-empty">No entries yet — add an invoice or your advance payment below.</div></td></tr>
                ) : (
                  state.rows.map(row => (
                    <tr key={row.id} data-row={row.id}>
                      <td>
                        <input 
                          type="date"
                          value={row.date || ''}
                          onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text"
                          value={row.description || ''}
                          onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                          placeholder="Invoice #102"
                        />
                      </td>
                      <td>
                        <input 
                          type="number"
                          step="0.01"
                          className="soa-num"
                          value={row.dr || ''}
                          onChange={(e) => updateRow(row.id, 'dr', e.target.value)}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <input 
                          type="number"
                          step="0.01"
                          className="soa-num"
                          value={row.cr || ''}
                          onChange={(e) => updateRow(row.id, 'cr', e.target.value)}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <button 
                          className="soa-btn-icon"
                          onClick={() => removeRow(row.id)}
                          title="Remove row"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <button className="soa-add-row-btn" onClick={() => addRow()}>
              <Plus size={16} /> Add transaction row
            </button>
          </div>

          {/* Notes */}
          <div className="soa-card">
            <h2>Notes / terms</h2>
            <div className="soa-field">
              <textarea 
                value={state.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <p style={{fontSize: '11.5px', color: '#7c8893', textAlign: 'center', margin: '0 0 12px'}}>
            Your details are saved privately to your account so you don't have to re-enter them next time.
          </p>
        </div>

        {/* Preview Panel */}
        <div className={`soa-preview-panel ${activeTab === 'preview' ? 'soa-active-tab' : ''}`}>
          <div className="soa-paper" ref={paperRef}>
            {renderDoc()}
          </div>
        </div>
      </div>
    </div>
  );
}