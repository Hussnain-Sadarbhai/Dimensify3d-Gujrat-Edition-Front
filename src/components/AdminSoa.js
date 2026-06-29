import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Plus, X, Save, FileText, Printer } from 'lucide-react';

export default function AdminSoa() {
  const [activeTab, setActiveTab] = useState('form');
  const [saveStatus, setSaveStatus] = useState(false);
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
    // Deep clone to ensure clean state
    const newState = JSON.parse(JSON.stringify(getDefaultState()));
    // Generate a new SOA number with today's date
    newState.meta.soaNumber = `SOA-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-01`;
    setState(newState);
    rowSeq.current = 1;
    // Clear localStorage draft
    localStorage.removeItem('soa_draft');
  };

  // Save profile explicitly
  const handleSaveProfile = () => {
    saveDraft();
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 1800);
  };

  // PDF generation using html2canvas + jsPDF
  const downloadPDF = async () => {
    const btn = document.getElementById('downloadPdfBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Generating PDF…';
    btn.disabled = true;

    try {
      const html2canvas = (await import('html2canvas')).default;
      
      const paper = paperRef.current;
      if (!paper) {
        alert('Paper element not found');
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      await new Promise(r => setTimeout(r, 80));

      const canvas = await html2canvas(paper, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = (pdfHeight - imgHeight * ratio) / 2;

      pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      const safeName = (state.meta.soaNumber || 'statement').toString().replace(/[^a-z0-9\-_.]+/gi, '_');
      pdf.save(safeName + '.pdf');
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Could not generate the PDF. Please try again — if it keeps failing, use your browser\'s Print option instead and choose "Save as PDF".');
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
      const tag = cr > 0 ? '<span class="tag">Payment received</span>' : '';
      return `
        <tr>
          <td>${fmtDate(r.date)}</td>
          <td class="desc-cell">${escapeHtml(r.description) || '<span style="color:#9aa6ad">—</span>'}${tag}</td>
          <td class="num">${dr > 0 ? cur + ' ' + fmt(dr) : '—'}</td>
          <td class="num">${cr > 0 ? cur + ' ' + fmt(cr) : '—'}</td>
          <td class="num">${cur} ${fmt(running)}</td>
        </tr>`;
    }).join('') : '<tr><td colspan="5" class="doc-table-empty">No transactions added yet.</td></tr>';

    const closing = totalDr - totalCr;
    const closingHtml = closing > 0
      ? `<div class="summary-line total due"><span>Balance due</span><span class="v">${cur} ${fmt(closing)}</span></div>`
      : `<div class="summary-line total advance"><span>Advance balance carried forward</span><span class="v">${cur} ${fmt(Math.abs(closing))}</span></div>`;

    const sealHtml = totalCr > 0 ? `
      <svg className="seal" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
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
      <div className="qr-block">
        <div className="qr-img-wrap" id="qrCodeBox">
          <QRCodeSVG 
            value={'upi://pay?pa=' + encodeURIComponent(state.profile.upi) + '&pn=' + encodeURIComponent(companyName) + '&am=' + balanceDue.toFixed(2) + '&cu=INR&tn=' + encodeURIComponent('Balance for ' + (state.meta.soaNumber || 'statement'))}
            size={72}
            bgColor="#ffffff"
            fgColor="#1c2b3a"
            level="M"
          />
        </div>
        <div className="qr-caption">Scan to pay via UPI<b>${cur} ${fmt(balanceDue)}</b></div>
      </div>` : '';
      
    const payHtml = showBank ? `
      <div className="pay-box">
        <div className="pay-left">
          <div className="label">Please remit any balance to</div>
          <div className="pay-grid">
            <div className="pay-item">Bank<b>${escapeHtml(state.profile.bankName) || '—'}</b></div>
            <div className="pay-item">Account holder<b>${escapeHtml(state.profile.accountName) || '—'}</b></div>
            <div className="pay-item">Account number<b>${escapeHtml(state.profile.accountNumber) || '—'}</b></div>
            <div className="pay-item">IFSC / SWIFT<b>${escapeHtml(state.profile.ifsc) || '—'}</b></div>
            <div className="pay-item">Branch<b>${escapeHtml(state.profile.branch) || '—'}</b></div>
          </div>
        </div>
        ${qrHtml}
      </div>` : '';

    const periodHtml = (state.meta.periodFrom || state.meta.periodTo)
      ? `<div className="doc-meta-line">Period: <b>${fmtDate(state.meta.periodFrom)} – ${fmtDate(state.meta.periodTo)}</b></div>` : '';

    return (
      <div className="doc-body">
        <div className="doc-head">
          <div>
            <div className="doc-co-name">{escapeHtml(companyName)}</div>
            <div className="doc-co-meta" dangerouslySetInnerHTML={{
              __html: escapeHtml(state.profile.address) + (state.profile.address ? '<br>' : '') +
                [state.profile.phone, state.profile.email].filter(Boolean).map(escapeHtml).join(' &nbsp;·&nbsp; ') +
                (state.profile.gstin ? '<br>GSTIN: ' + escapeHtml(state.profile.gstin) : '')
            }} />
          </div>
          <div className="doc-title-box">
            <div className="doc-title">STATEMENT OF ACCOUNT</div>
            <div className="doc-meta-line">No. <b>{escapeHtml(state.meta.soaNumber)}</b></div>
            <div className="doc-meta-line">Date: <b>{fmtDate(state.meta.statementDate)}</b></div>
            <div dangerouslySetInnerHTML={{ __html: periodHtml }} />
          </div>
        </div>

        <div className="doc-billto">
          <div className="label">Statement for</div>
          <div className="name">{escapeHtml(clientName)}</div>
          <div className="addr">{escapeHtml(state.client.address)}</div>
        </div>

        <table className="doc-table">
          <thead>
            <tr><th>Date</th><th>Particulars</th><th className="num">Invoiced</th><th className="num">Received</th><th className="num">Balance</th></tr>
          </thead>
          <tbody dangerouslySetInnerHTML={{ __html: rowsHtml }} />
        </table>

        <div className="summary-wrap">
          <div dangerouslySetInnerHTML={{ __html: sealHtml }} />
          <div className="summary-box">
            <div className="summary-line"><span>Total invoiced</span><span className="v">{cur} {fmt(totalDr)}</span></div>
            <div className="summary-line"><span>Total received</span><span className="v">{cur} {fmt(totalCr)}</span></div>
            <div dangerouslySetInnerHTML={{ __html: closingHtml }} />
          </div>
        </div>

        <div dangerouslySetInnerHTML={{ __html: payHtml }} />

        {state.notes && <div className="doc-notes">{escapeHtml(state.notes)}</div>}

        <div className="doc-footer">
          <div className="printed-note">Generated on {fmtDate(todayISO())}</div>
          <div className="sign-block">
            <div className="sign-line"></div>
            <div className="sign-label">For {escapeHtml(companyName)} — Authorized Signatory</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="soa-container">
      <style>{`
        :root {
          --ink: #1c2b3a;
          --ink-soft: #5b6b7a;
          --paper: #fbf9f4;
          --rule: #d8d2c4;
          --rule-soft: #e8e3d4;
          --brass: #92742f;
          --brass-soft: #c7a565;
          --due: #8c3a3a;
          --panel-bg: #eef1f4;
          --panel-card: #ffffff;
          --panel-border: #d7dde3;
          --navy: #24405e;
          --navy-dark: #1b3047;
          --focus: #3a6ea5;
          --font-display: 'Source Serif 4', Georgia, serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --font-mono: 'IBM Plex Mono', monospace;
        }
        
        .soa-container * { box-sizing: border-box; }
        .soa-container { 
          font-family: var(--font-body);
          color: var(--ink);
        }
        
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 24px;
          background: var(--navy-dark);
          color: #fff;
          position: sticky;
          top: 0;
          z-index: 30;
        }
        
        .brand { display: flex; align-items: baseline; gap: 10px; }
        .brand-mark {
          font-family: var(--font-mono);
          font-size: 13px;
          letter-spacing: 2px;
          background: var(--brass);
          color: #ffffff;
          padding: 3px 7px;
          border-radius: 3px;
          font-weight: 600;
        }
        .brand-text {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 600;
          letter-spacing: .2px;
          color: #ffffff;
        }
        
        .topbar-actions { display: flex; gap: 10px; }
        .btn {
          border: 1px solid transparent;
          border-radius: 6px;
          padding: 9px 16px;
          font-size: 13.5px;
          font-weight: 600;
          transition: transform .08s ease, background .15s ease, border-color .15s ease;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #ffffff;
        }
        .btn-primary {
          background: var(--brass);
          color: #ffffff;
        }
        .btn-primary:hover { background: var(--brass-soft); }
        .btn-ghost {
          background: transparent;
          color: #ffffff;
          border-color: rgba(255,255,255,.35);
        }
        .btn-ghost:hover { border-color: #fff; }
        .btn-link {
          background: none;
          border: none;
          color: var(--navy);
          font-weight: 600;
          font-size: 13px;
          padding: 0;
          text-decoration: underline;
          cursor: pointer;
        }
        .btn-icon {
          background: none;
          border: none;
          color: #9aa6ad;
          font-size: 18px;
          line-height: 1;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-icon:hover { background: #fbeaea; color: var(--due); }
        
        .mobile-tabs { display: none; gap: 6px; }
        .tab-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,.35);
          color: #ffffff;
          border-radius: 6px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .tab-btn.active {
          background: #fff;
          color: var(--navy-dark);
          border-color: #fff;
        }
        
        .layout {
          display: grid;
          grid-template-columns: 560px 1fr;
          gap: 0;
          align-items: start;
          min-height: calc(100vh - 56px);
        }
        
        .form-panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          max-height: calc(100vh - 56px);
          overflow-y: auto;
          background: var(--panel-bg);
        }
        
        .card {
          background: var(--panel-card);
          border: 1px solid var(--panel-border);
          border-radius: 10px;
          padding: 18px 18px 20px;
        }
        .card h2 {
          margin: 0 0 4px;
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--navy);
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: space-between;
        }
        .card .hint {
          margin: 0 0 14px;
          font-size: 12.5px;
          color: var(--ink-soft);
          line-height: 1.5;
        }
        .field { margin-bottom: 11px; }
        .field label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-soft);
          margin-bottom: 4px;
        }
        .field input, .field textarea {
          width: 100%;
          border: 1px solid var(--panel-border);
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13.5px;
          color: var(--ink);
          background: #fff;
          font-family: var(--font-body);
        }
        .field input:focus, .field textarea:focus {
          outline: 2px solid var(--focus);
          outline-offset: 1px;
          border-color: var(--focus);
        }
        .field textarea { resize: vertical; min-height: 54px; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        
        .save-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 6px;
        }
        .save-status {
          font-size: 12px;
          color: var(--brass);
          font-weight: 600;
          opacity: 0;
          transition: opacity .25s ease;
        }
        .save-status.show { opacity: 1; }
        
        .tx-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        .tx-table th {
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: .5px;
          color: var(--ink-soft);
          text-align: left;
          padding: 4px 6px;
          border-bottom: 1px solid var(--panel-border);
        }
        .tx-table td { padding: 4px; vertical-align: top; }
        .tx-table input {
          width: 100%;
          border: 1px solid var(--panel-border);
          border-radius: 5px;
          padding: 6px 7px;
          font-size: 13px;
        }
        .tx-table input.num { 
          text-align: right;
          font-family: var(--font-mono);
        }
        .tx-empty {
          font-size: 12.5px;
          color: var(--ink-soft);
          font-style: italic;
          padding: 10px 2px 14px;
        }
        .add-row-btn {
          width: 100%;
          border: 1.5px dashed var(--panel-border);
          background: #fafbfc;
          border-radius: 6px;
          padding: 9px;
          font-size: 13px;
          font-weight: 600;
          color: var(--navy);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .add-row-btn:hover { border-color: var(--navy); background: #f1f5f8; }
        
        .preview-panel {
          background: #dde2e6;
          padding: 24px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        
        .paper {
          width: 100%;
          max-width: 700px;
          background: var(--paper);
          box-shadow: 0 6px 24px rgba(20,30,40,.18);
          padding: 40px 44px 36px;
          font-family: var(--font-body);
        }
        
        .doc-head {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 2px solid var(--ink);
          padding-bottom: 14px;
          margin-bottom: 18px;
        }
        .doc-co-name {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 4px;
        }
        .doc-co-meta {
          font-size: 12px;
          color: var(--ink-soft);
          line-height: 1.5;
          max-width: 280px;
        }
        .doc-title-box {
          text-align: right;
          min-width: 180px;
        }
        .doc-title {
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 1.5px;
          color: var(--brass);
          font-weight: 600;
          margin-bottom: 8px;
        }
        .doc-meta-line {
          font-size: 12px;
          color: var(--ink-soft);
          margin-bottom: 2px;
        }
        .doc-meta-line b { color: var(--ink); font-weight: 600; }
        
        .doc-billto { margin-bottom: 20px; }
        .doc-billto .label {
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--brass);
          font-weight: 700;
          margin-bottom: 4px;
        }
        .doc-billto .name {
          font-size: 15px;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 2px;
        }
        .doc-billto .addr {
          font-size: 12px;
          color: var(--ink-soft);
          white-space: pre-line;
          line-height: 1.5;
        }
        
        table.doc-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
          font-size: 12.5px;
        }
        table.doc-table thead th {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .5px;
          color: #fff;
          background: var(--navy);
          text-align: left;
          padding: 6px 10px;
        }
        table.doc-table thead th.num { text-align: right; }
        table.doc-table tbody td {
          font-size: 12.5px;
          padding: 7px 10px;
          border-bottom: 1px solid var(--rule-soft);
          color: var(--ink);
        }
        table.doc-table tbody tr:last-child td { border-bottom: 1px solid var(--rule); }
        table.doc-table td.num {
          text-align: right;
          font-family: var(--font-mono);
          font-size: 12px;
        }
        table.doc-table td.desc-cell .tag {
          display: inline-block;
          margin-top: 2px;
          font-size: 9px;
          letter-spacing: .4px;
          text-transform: uppercase;
          color: var(--brass);
          font-weight: 700;
          border: 1px solid var(--brass-soft);
          border-radius: 3px;
          padding: 1px 5px;
        }
        .doc-table-empty {
          font-size: 12px;
          color: var(--ink-soft);
          font-style: italic;
          padding: 14px 4px;
          border-bottom: 1px solid var(--rule);
        }
        
        .summary-wrap {
          position: relative;
          display: flex;
          justify-content: flex-end;
          margin-top: 6px;
          margin-bottom: 24px;
        }
        .summary-box { width: 260px; }
        .summary-line {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--ink-soft);
          padding: 4px 0;
        }
        .summary-line .v {
          font-family: var(--font-mono);
          color: var(--ink);
        }
        .summary-line.total {
          border-top: 2px solid var(--ink);
          margin-top: 4px;
          padding-top: 8px;
          font-size: 14px;
          font-weight: 700;
          color: var(--ink);
        }
        .summary-line.total .v { font-size: 14px; }
        .summary-line.total.due .v { color: var(--due); }
        .summary-line.total.advance .v { color: var(--brass); }
        
        .seal {
          position: absolute;
          left: 0;
          top: 6px;
          width: 110px;
          height: 110px;
          transform: rotate(-9deg);
          opacity: .92;
        }
        
        .pay-box {
          background: #f3eee0;
          border: 1px solid var(--rule);
          border-radius: 6px;
          padding: 14px 16px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .pay-left { flex: 1; min-width: 0; }
        .pay-box .label {
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--brass);
          font-weight: 700;
          margin-bottom: 8px;
        }
        .pay-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 18px;
        }
        .pay-item {
          font-size: 12px;
          color: var(--ink-soft);
        }
        .pay-item b {
          display: block;
          color: var(--ink);
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          margin-top: 1px;
        }
        
        .qr-block {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .qr-block .qr-img-wrap {
          background: #fff;
          padding: 5px;
          border: 1px solid var(--rule);
          border-radius: 4px;
        }
        .qr-block .qr-img-wrap img,
        .qr-block .qr-img-wrap canvas {
          display: block;
          width: 72px;
          height: 72px;
        }
        .qr-caption {
          font-size: 9px;
          color: var(--ink-soft);
          margin-top: 5px;
          line-height: 1.4;
        }
        .qr-caption b {
          display: block;
          color: var(--ink);
          font-family: var(--font-mono);
          font-size: 11px;
        }
        
        .doc-notes {
          font-size: 11.5px;
          color: var(--ink-soft);
          font-style: italic;
          line-height: 1.6;
          margin-bottom: 28px;
          white-space: pre-line;
        }
        
        .doc-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-top: 1px solid var(--rule);
          padding-top: 14px;
        }
        .sign-block { text-align: center; }
        .sign-line {
          width: 150px;
          border-bottom: 1px solid var(--ink-soft);
          height: 32px;
        }
        .sign-label {
          font-size: 11px;
          color: var(--ink-soft);
          margin-top: 5px;
        }
        .printed-note { font-size: 10px; color: var(--ink-soft); }
        
        /* Responsive */
        @media (max-width: 1200px) {
          .layout {
            grid-template-columns: 480px 1fr;
          }
        }
        
        @media (max-width: 980px) {
          .layout { grid-template-columns: 1fr; }
          .mobile-tabs { display: flex; }
          .form-panel, .preview-panel { display: none; }
          .form-panel.active-tab, .preview-panel.active-tab { display: flex; }
          .preview-panel.active-tab { display: flex; justify-content: center; }
          .paper { padding: 24px 20px; max-width: 100%; }
          .doc-head { flex-direction: column; }
          .doc-title-box { text-align: left; }
        }
        @media (max-width: 520px) {
          .row2, .row3 { grid-template-columns: 1fr; }
          .pay-grid { grid-template-columns: 1fr; }
          .topbar { padding: 12px 14px; flex-wrap: wrap; }
          .brand-text { font-size: 14px; }
          .topbar-actions { flex-wrap: wrap; }
          .form-panel { padding: 16px; }
          .paper { padding: 16px; }
        }
        
        /* Print styles */
        @media print {
          body, .preview-panel { background: #fff !important; }
          .topbar, .form-panel { display: none !important; }
          .layout { grid-template-columns: 1fr !important; }
          .preview-panel { 
            padding: 0 !important; 
            display: block !important; 
            justify-content: flex-start !important;
          }
          .paper {
            box-shadow: none !important;
            max-width: none !important;
            width: auto !important;
            padding: 18px 8px !important;
            margin: 0 !important;
          }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      {/* Top Bar */}
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark">SOA</span>
          <span style={{color:"#fff"}}>Statement Generator</span>
        </div>
        <div className="mobile-tabs">
          <button 
            className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            Edit
          </button>
          <button 
            className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={handleNewStatement}>
            <FileText size={16} /> New
          </button>
          <button 
            id="downloadPdfBtn"
            className="btn btn-primary"
            onClick={downloadPDF}
          >
            <Download size={16} /> PDF
          </button>
          <button className="btn btn-ghost" onClick={handlePrint}>
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="layout">
        {/* Form Panel */}
        <div className={`form-panel ${activeTab === 'form' ? 'active-tab' : ''}`} id="formPanel">
          {/* Business Profile */}
          <div className="card">
            <h2>Your business</h2>
            <p className="hint">Appears as the letterhead on every statement.</p>
            <div className="field">
              <label>Business name</label>
              <input 
                value={state.profile.companyName}
                onChange={(e) => handleFieldChange('profile.companyName', e.target.value)}
                placeholder="Acme Studio Pvt. Ltd."
              />
            </div>
            <div className="field">
              <label>Address</label>
              <textarea 
                value={state.profile.address}
                onChange={(e) => handleFieldChange('profile.address', e.target.value)}
                placeholder="12 MG Road, Indiranagar, Bengaluru, Karnataka 560038"
                rows={2}
              />
            </div>
            <div className="row2">
              <div className="field">
                <label>Phone</label>
                <input 
                  value={state.profile.phone}
                  onChange={(e) => handleFieldChange('profile.phone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input 
                  value={state.profile.email}
                  onChange={(e) => handleFieldChange('profile.email', e.target.value)}
                  placeholder="hello@acmestudio.in"
                />
              </div>
            </div>
            <div className="field">
              <label>GSTIN / Tax ID (optional)</label>
              <input 
                value={state.profile.gstin}
                onChange={(e) => handleFieldChange('profile.gstin', e.target.value)}
                placeholder="29ABCDE1234F1Z5"
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="card">
            <h2>Bank details for payment</h2>
            <p className="hint">Shown at the bottom of the statement so clients know where to pay any balance.</p>
            <div className="field">
              <label>Bank name</label>
              <input 
                value={state.profile.bankName}
                onChange={(e) => handleFieldChange('profile.bankName', e.target.value)}
                placeholder="HDFC Bank"
              />
            </div>
            <div className="field">
              <label>Account holder name</label>
              <input 
                value={state.profile.accountName}
                onChange={(e) => handleFieldChange('profile.accountName', e.target.value)}
                placeholder="Acme Studio Pvt. Ltd."
              />
            </div>
            <div className="row2">
              <div className="field">
                <label>Account number</label>
                <input 
                  value={state.profile.accountNumber}
                  onChange={(e) => handleFieldChange('profile.accountNumber', e.target.value)}
                  placeholder="50100123456789"
                />
              </div>
              <div className="field">
                <label>IFSC / SWIFT code</label>
                <input 
                  value={state.profile.ifsc}
                  onChange={(e) => handleFieldChange('profile.ifsc', e.target.value)}
                  placeholder="HDFC0001234"
                />
              </div>
            </div>
            <div className="field">
              <label>Branch</label>
              <input 
                value={state.profile.branch}
                onChange={(e) => handleFieldChange('profile.branch', e.target.value)}
                placeholder="Indiranagar, Bengaluru"
              />
            </div>
            <div className="field">
              <label>UPI ID (optional — generates a scan-to-pay QR for the balance due)</label>
              <input 
                value={state.profile.upi}
                onChange={(e) => handleFieldChange('profile.upi', e.target.value)}
                placeholder="yourname@okhdfcbank"
              />
            </div>
            <div className="save-row">
              <button className="btn-link" onClick={handleSaveProfile}>
                <Save size={14} /> Save these as my defaults
              </button>
              <span className={`save-status ${saveStatus ? 'show' : ''}`}>Saved ✓</span>
            </div>
          </div>

          {/* Client */}
          <div className="card">
            <h2>Bill to</h2>
            <div className="field">
              <label>Client name</label>
              <input 
                value={state.client.name}
                onChange={(e) => handleFieldChange('client.name', e.target.value)}
                placeholder="Bluepeak Retail LLP"
              />
            </div>
            <div className="field">
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
          <div className="card">
            <h2>Statement details</h2>
            <div className="row2">
              <div className="field">
                <label>Statement no.</label>
                <input 
                  value={state.meta.soaNumber}
                  onChange={(e) => handleFieldChange('meta.soaNumber', e.target.value)}
                />
              </div>
              <div className="field">
                <label>Statement date</label>
                <input 
                  type="date"
                  value={state.meta.statementDate}
                  onChange={(e) => handleFieldChange('meta.statementDate', e.target.value)}
                />
              </div>
            </div>
            <div className="row3">
              <div className="field">
                <label>Period from</label>
                <input 
                  type="date"
                  value={state.meta.periodFrom}
                  onChange={(e) => handleFieldChange('meta.periodFrom', e.target.value)}
                />
              </div>
              <div className="field">
                <label>Period to</label>
                <input 
                  type="date"
                  value={state.meta.periodTo}
                  onChange={(e) => handleFieldChange('meta.periodTo', e.target.value)}
                />
              </div>
              <div className="field">
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
          <div className="card">
            <h2>Transactions</h2>
            <p className="hint">
              Add each invoice under <b>Invoiced</b>. Add the advance payment(s) you've already received under <b>Received</b> — any row with a received amount gets tagged and rolled into the "payment received" stamp automatically.
            </p>
            <table className="tx-table">
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
                  <tr><td colSpan="5"><div className="tx-empty">No entries yet — add an invoice or your advance payment below.</div></td></tr>
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
                          className="num"
                          value={row.dr || ''}
                          onChange={(e) => updateRow(row.id, 'dr', e.target.value)}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <input 
                          type="number"
                          step="0.01"
                          className="num"
                          value={row.cr || ''}
                          onChange={(e) => updateRow(row.id, 'cr', e.target.value)}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <button 
                          className="btn-icon"
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
            <button className="add-row-btn" onClick={() => addRow()}>
              <Plus size={16} /> Add transaction row
            </button>
          </div>

          {/* Notes */}
          <div className="card">
            <h2>Notes / terms</h2>
            <div className="field">
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
        <div className={`preview-panel ${activeTab === 'preview' ? 'active-tab' : ''}`}>
          <div className="paper" ref={paperRef}>
            {renderDoc()}
          </div>
        </div>
      </div>
    </div>
  );
}