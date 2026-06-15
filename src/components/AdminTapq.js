import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import logo from '../images/logo-1.png';
import './AdminTapq.css';

const GST_STATES = [
  ['Jammu and Kashmir','1'],['Himachal Pradesh','2'],['Punjab','3'],['Chandigarh','4'],
  ['Uttarakhand','5'],['Haryana','6'],['Delhi','7'],['Rajasthan','8'],['Uttar Pradesh','9'],
  ['Bihar','10'],['Sikkim','11'],['Arunachal Pradesh','12'],['Nagaland','13'],['Manipur','14'],
  ['Mizoram','15'],['Tripura','16'],['Meghalaya','17'],['Assam','18'],['West Bengal','19'],
  ['Jharkhand','20'],['Odisha','21'],['Chhattisgarh','22'],['Madhya Pradesh','23'],
  ['Gujarat','24'],['Dadra and Nagar Haveli and Daman and Diu','26'],['Maharashtra','27'],
  ['Karnataka','29'],['Goa','30'],['Lakshadweep','31'],['Kerala','32'],['Tamil Nadu','33'],
  ['Puducherry','34'],['Andaman and Nicobar Islands','35'],['Telangana','36'],
  ['Andhra Pradesh','37'],['Ladakh','38'],['Other Territory','97'],['Centre Jurisdiction','99']
];

const TERMS_DATA = [
  ['1. Design Responsibility',[
    '1. The customer is responsible for providing the correct and final 3D model (STL/OBJ format).',
    '2. Dimensify3D Printing Services is not liable for dimensional inaccuracies or design errors in customer provided files. Any design modification request after quotation approval may incur additional charges.',
    '3. If design correction or optimization is required, design fees will be quoted separately.'
  ]],
  ['2. Material & Print Quality',[
    '1. Minor surface imperfections or layer lines are natural characteristics of FDM 3D printing.',
    '2. Exact color matching cannot be guaranteed due to filament batch variation.',
    '3. Dimensional tolerance will typically be within +/-0.3 mm.'
  ]],
  ['3. Approval & Payment',[
    '1. Printing will commence only after advance 20% payment and final model approval.',
    '2. Payment once made is non-refundable after the printing process begins.',
    '3. Any additional work or reprinting due to design revisions will be billed separately.'
  ]],
  ['4. Delivery & Shipping',[
    '1. Estimated delivery time is provided based on current queue and print complexity.',
    '2. Delivery delays due to machine maintenance, power failure, or unforeseen issues will be communicated promptly.'
  ]],
  ['5. Cancellation & Refund Policy',[
    '1. Orders can be cancelled only before the printing process begins.',
    '2. Once printing starts, cancellation or refund will not be possible. If cancellation is made before printing, any CAD/model preparation charges will be deducted.'
  ]],
  ['6. Reprint / Replacement Policy',[
    '1. Reprints are accepted only in case of manufacturing defects or printing errors from our side.',
    '2. Claims must be made within 15 days of delivery, along with photos and issue details.',
    '3. Replacement timeline will depend on workload and material availability.'
  ]],
  ['7. Intellectual Property & Confidentiality',[
    '1. All customer designs are treated as confidential and not shared with any third party.',
    '2. Dimensify3D Printing Services does not claim ownership of customer-provided designs.',
    '3. The customer confirms that submitted designs do not infringe on any patents, trademarks, or copyrights.'
  ]],
  ['8. General Terms',[
    '1. Prices are subject to change based on market material cost fluctuations.',
    '2. By approving the quotation, the customer agrees to all the above terms and conditions.'
  ]]
];

// FIX 2: Number input that never shows 0 by default and blocks scroll
function NumInput({ value, onChange, placeholder, className, style, min, step }) {
  const handleWheel = (e) => e.target.blur(); // prevent scroll changing value
  const displayVal = (value === 0 || value === '0' || value === '') ? '' : value;
  return (
    <input
      type="number"
      className={className}
      style={style}
      placeholder={placeholder || '0'}
      value={displayVal}
      min={min}
      step={step}
      onWheel={handleWheel}
      onChange={onChange}
      onKeyDown={(e) => {
        // Block up/down arrow keys too
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
      }}
    />
  );
}

export default function AdminTapq() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const [formData, setFormData] = useState({
    custName: '',
    custPhone: '',
    custAddress: '',
    custEmail: '',
    custState: 'Karnataka, Code : 29',
    invoiceNum: '',
    docType: 'TAX INVOICE',
    gstType: 'igst',
  });

  const [items, setItems] = useState([]);

  const [gstRates, setGstRates] = useState({
    igstRate: 18,
    cgstRate: 9,
    sgstRate: 9,
  });

  const [dueDate, setDueDate] = useState('');
  const [itemIdCounter, setItemIdCounter] = useState(3);

  const [showAdvanceSection, setShowAdvanceSection] = useState(false);
  const [advanceEntries, setAdvanceEntries] = useState([]);
  const [advanceEntryCounter, setAdvanceEntryCounter] = useState(1);

  const qrCanvasRef = useRef(null);

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    const pad = (n) => String(n).padStart(2, '0');
    setDueDate(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
  }, []);

  const pad = (n) => String(n).padStart(2, '0');

  const todayStr = () => {
    const d = new Date();
    return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear();
  };

  // FIX 4: Check if all required fields are filled
  const isFormValid = () => {
    if (!formData.custName.trim()) return false;
    if (!formData.custPhone.trim()) return false;
    if (!formData.custAddress.trim()) return false;
    if (!formData.invoiceNum.trim()) return false;
    if (items.length === 0) return false;
    const hasInvalidItem = items.some(
      item => !item.desc.trim() || item.price <= 0 || item.qty <= 0
    );
    if (hasInvalidItem) return false;
    return true;
  };

  const getMissingFields = () => {
    const missing = [];
    if (!formData.custName.trim()) missing.push('Customer Name');
    if (!formData.custPhone.trim()) missing.push('Phone');
    if (!formData.custAddress.trim()) missing.push('Address');
    if (!formData.invoiceNum.trim()) missing.push('Invoice Number');
    if (items.length === 0) missing.push('At least one Item');
    else {
      items.forEach((item, idx) => {
        if (!item.desc.trim()) missing.push(`Item #${idx + 1} description`);
        if (item.price <= 0) missing.push(`Item #${idx + 1} price`);
      });
    }
    return missing;
  };

  const numToWords = (n) => {
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
      'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    if (n === 0) return 'Zero';
    function chunk(x) {
      if (x === 0) return '';
      if (x < 20) return ones[x] + ' ';
      if (x < 100) return tens[Math.floor(x/10)] + ' ' + (ones[x%10] ? ones[x%10] + ' ' : '');
      return ones[Math.floor(x/100)] + ' Hundred ' + (x%100 ? chunk(x%100) : '');
    }
    let r = '';
    let x = Math.floor(n);
    if (x >= 10000000) { r += chunk(Math.floor(x/10000000)) + 'Crore '; x %= 10000000; }
    if (x >= 100000)   { r += chunk(Math.floor(x/100000))   + 'Lakh ';  x %= 100000;   }
    if (x >= 1000)     { r += chunk(Math.floor(x/1000))     + 'Thousand '; x %= 1000;  }
    r += chunk(x);
    return r.trim() + ' Rupees Only';
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // FIX 1: For address, replace newlines with space to keep it one line
    if (name === 'custAddress') {
      const singleLine = value.replace(/[\r\n]+/g, ' ');
      setFormData(prev => ({ ...prev, [name]: singleLine }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleGstRateChange = (e) => {
    const { name, value } = e.target;
    setGstRates(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

const handleAddItem = () => {
    const newId = itemIdCounter;
    setItems(prev => [...prev, { id: newId, desc: '', hsn: '', qty: 1, price: '' }]);
    setItemIdCounter(newId + 1);
  };

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item =>
      item.id === id
        ? {
            ...item,
            [field]: (field === 'qty' || field === 'price')
              ? (value === '' ? '' : parseFloat(value) || 0)
              : value
          }
        : item
    ));
  };

  const handleRemoveItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // ── ADVANCE PAYMENT HANDLERS ──────────────────────────────────────────────

  const handleOpenAdvanceSection = () => {
    setShowAdvanceSection(true);
    const newId = advanceEntryCounter;
    setAdvanceEntries([{ id: newId, advId: '', amount: '', applied: false }]);
    setAdvanceEntryCounter(newId + 1);
  };

  const handleCloseAdvanceSection = () => {
    setShowAdvanceSection(false);
    setAdvanceEntries([]);
  };

  const handleAdvanceEntryChange = (id, field, value) => {
    setAdvanceEntries(prev =>
      prev.map(e => e.id === id ? { ...e, [field]: value } : e)
    );
  };

  const handleApplyAdvanceEntry = (id) => {
    setAdvanceEntries(prev =>
      prev.map(e => e.id === id ? { ...e, applied: true } : e)
    );
  };

  const handleAddAnotherAdvance = () => {
    const newId = advanceEntryCounter;
    setAdvanceEntries(prev => [...prev, { id: newId, advId: '', amount: '', applied: false }]);
    setAdvanceEntryCounter(newId + 1);
  };

  const handleRemoveAdvanceEntry = (id) => {
    setAdvanceEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      if (updated.length === 0) {
        setShowAdvanceSection(false);
      }
      return updated;
    });
  };

  const handleEditAdvanceEntry = (id) => {
    setAdvanceEntries(prev =>
      prev.map(e => e.id === id ? { ...e, applied: false } : e)
    );
  };

  // ── TOTALS ────────────────────────────────────────────────────────────────

  const getGstInfo = () => {
    if (formData.gstType === 'igst') {
      return { type: 'igst', rate: gstRates.igstRate, cgst: 0, sgst: 0 };
    } else {
      return { type: 'cgst_sgst', rate: gstRates.cgstRate + gstRates.sgstRate, cgst: gstRates.cgstRate, sgst: gstRates.sgstRate };
    }
  };

  const calculateTotals = () => {
    const gst = getGstInfo();
    let taxable = 0;
    items.forEach(item => {
      const q = parseFloat(item.qty) || 0;
      const p = parseFloat(item.price) || 0;
      taxable += q * p;
    });
    const gstTotal = taxable * gst.rate / 100;
    const total = taxable + gstTotal;

    const appliedAdvances = advanceEntries.filter(e => e.applied && parseFloat(e.amount) > 0);
    const totalAdvance = appliedAdvances.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const balancePayable = Math.max(0, total - totalAdvance);

    return { taxable, gstTotal, total, gst, totalAdvance, balancePayable, appliedAdvances };
  };

  const { taxable, gstTotal, total, gst, totalAdvance, balancePayable, appliedAdvances } = calculateTotals();

  const allApplied = advanceEntries.length > 0 && advanceEntries.every(e => e.applied);

  const generateQR = (text) => {
    return new Promise((resolve) => {
      if (window.QRCode) {
        if (qrCanvasRef.current) {
          qrCanvasRef.current.innerHTML = '';
          new window.QRCode(qrCanvasRef.current, {
            text, width: 80, height: 80,
            correctLevel: window.QRCode.CorrectLevel.M
          });
          setTimeout(() => {
            const canvas = qrCanvasRef.current?.querySelector('canvas');
            resolve(canvas ? canvas.toDataURL('image/png') : null);
          }, 400);
        }
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      script.onload = () => {
        if (qrCanvasRef.current) {
          qrCanvasRef.current.innerHTML = '';
          new window.QRCode(qrCanvasRef.current, {
            text, width: 80, height: 80,
            correctLevel: window.QRCode.CorrectLevel.M
          });
          setTimeout(() => {
            const canvas = qrCanvasRef.current?.querySelector('canvas');
            resolve(canvas ? canvas.toDataURL('image/png') : null);
          }, 400);
        }
      };
      document.head.appendChild(script);
    });
  };

  const getSignatureDataURL = () => {
    const c = document.createElement('canvas');
    c.width = 240; c.height = 90;
    const ctx = c.getContext('2d');
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a2332';
    ctx.beginPath();
    ctx.moveTo(15, 60);
    ctx.bezierCurveTo(30, 15, 45, 75, 60, 40);
    ctx.bezierCurveTo(70, 20, 80, 65, 95, 45);
    ctx.bezierCurveTo(105, 30, 115, 55, 130, 40);
    ctx.bezierCurveTo(140, 30, 150, 55, 165, 42);
    ctx.bezierCurveTo(178, 30, 190, 50, 205, 38);
    ctx.bezierCurveTo(212, 32, 218, 40, 225, 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, 72);
    ctx.bezierCurveTo(60, 85, 160, 85, 220, 68);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    return c.toDataURL('image/png');
  };

  const generatePDF = async () => {
    if (!isFormValid()) return;

    const custName     = formData.custName.trim()    || 'N/A';
    const custPhone    = formData.custPhone.trim()   || 'N/A';
    // FIX 1: Normalize address — collapse spaces, replace newlines → single line
    const custAddress  = formData.custAddress.trim().replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ') || 'N/A';
    const custEmail    = formData.custEmail.trim()   || 'NA';
    const custState    = formData.custState.trim()   || 'N/A';
    const invoiceNum   = formData.invoiceNum.trim()  || 'D3D-XXXXXXXX';
    const invoiceDate  = todayStr();
    const docType      = formData.docType;

    let dueDateStr = 'N/A';
    if (dueDate) {
      const d = new Date(dueDate);
      dueDateStr = pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear();
    }

    const qrData = await generateQR(
      'upi://pay?pa=9483914542@kotak811&pn=MohammedAdilBetageri&am=' +
      (totalAdvance > 0 ? balancePayable : total).toFixed(2) + '&cu=INR'
    );
    const sigImg = getSignatureDataURL();

    const W = 595.28, ML = 28, MR = 28, MT = 22;
    const itemRows = Math.max(items.length, 5);
    const estItemsTableH = 20 + itemRows * 18;

    const advanceRowsH = appliedAdvances.length > 0 ? (appliedAdvances.length * 12) + 20 : 0;

    // FIX 5: Calculate content height then set PDF height = content height exactly
    // We'll compute everything first, then create PDF with exact height
    // Use A4 as base but we'll adjust
    const W_PDF = 595.28;

    const C = {
      darkBlue:  [26, 35, 50],
      midBlue:   [45, 74, 110],
      accent:    [58, 123, 213],
      grey:      [140, 155, 175],
      lightGrey: [225, 230, 238],
      veryLight: [245, 247, 251],
      white:     [255, 255, 255],
      black:     [0, 0, 0],
      red:       [180, 40, 40],
      green:     [30, 140, 80],
    };

    // ── FIX 5: Pre-calculate total content height to eliminate empty space ──
    // Simulate layout to know exact height needed
    const simulateLayout = () => {
      let sy = MT;
      sy += 46 + 10; // header + divider gap

      // Billing section: approx 90pt max
      const addrLines = Math.ceil(custAddress.length / 38);
      const btHeight = 12 + 11 + (addrLines * 10) + 10 + 10 + 10;
      const byHeight = 12 + (6 * 10);
      const invoiceH = 12 + (4 * 11);
      sy += Math.max(invoiceH, byHeight, btHeight) + 16 + 1 + 8;

      // Items table
      sy += 20 + (Math.max(items.length, 5) * 18) + 1;

      // Totals
      sy += 10; // gap
      const gstRows = gst.type === 'igst' ? 2 : 3;
      sy += gstRows * 12 + 2 + 1 + 8 + 12; // totals rows + divider + Total Amount
      if (appliedAdvances.length > 0) {
        sy += appliedAdvances.length * 12 + 2;
        if (appliedAdvances.length > 1) sy += 12 + 2;
        sy += 1 + 8 + 12; // Balance payable
      }
      sy += 5; // balance in words
      sy += 10 + 42 + 10 + 10 + 9; // signatory
      sy += 26 + 1 + 12; // bottom divider

      // Bank section
      sy += 12 + 11 + 11 + 14; // bank rows
      if (qrData) sy += 65 + 8; else sy += 8;
      sy += 10 + 14 + 10 + 10 + 16; // meta rows + terms of delivery

      // Terms
      sy += 1 + 10 + 12; // divider + label

      // Simulate terms columns
      const fullW = W - ML - MR;
      const termsColW = (fullW - 14) / 2;
      const half = Math.ceil(TERMS_DATA.length / 2);
      const calcColHeight = (data) => {
        let h = 0;
        data.forEach(([, bullets]) => {
          h += 10;
          bullets.forEach(b => {
            // approximate chars per line at font 7
            h += Math.ceil(b.length / 80) * 8.5;
          });
          h += 3;
        });
        return h;
      };
      const leftH = calcColHeight(TERMS_DATA.slice(0, half));
      const rightH = calcColHeight(TERMS_DATA.slice(half));
      sy += Math.max(leftH, rightH);

      sy += 20; // footer gap
      return sy;
    };

    const contentH = simulateLayout();
    // Add footer bar height (20pt) + small bottom padding
    const footerBarH = 20;
    const totalNeeded = contentH + footerBarH + 8;
    // PDF height = exactly what we need (no extra space)
    const H = totalNeeded;

    const doc = new jsPDF({ unit: 'pt', format: [W, H], putOnlyUsedFonts: true });
    doc.setFont('helvetica');

    const sf = (style, size, color) => {
      doc.setFont('helvetica', style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };
    const ln = (x1, y1, x2, y2, color, w) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(w || 0.5);
      doc.line(x1, y1, x2, y2);
    };
    const rx = (x, y, w, h, fill, stroke, lw) => {
      if (fill)   { doc.setFillColor(...fill);   doc.rect(x, y, w, h, 'F'); }
      if (stroke) { doc.setDrawColor(...stroke); doc.setLineWidth(lw || 0.5); doc.rect(x, y, w, h, 'S'); }
    };
    const rs  = (v) => 'Rs. ' + Number(v).toFixed(2);
    const tx  = (str, x, y, opts) => { doc.text(str, x, y, opts || {}); };

    // ── HEADER ──────────────────────────────────────────────────────────────
    let y = MT;
    if (logo) doc.addImage(logo, 'PNG', ML, y - 3, 36, 36);
    sf('bold', 13, C.darkBlue);
    tx('DIMENSIFY3D', ML + 46, y + 15);
    sf('normal', 8, C.grey);
    tx('3D Printing Services', ML + 46, y + 27);
    sf('bold', 22, C.darkBlue);
    tx(docType, W - MR, y + 24, { align: 'right' });
    y += 46;
    ln(ML, y, W - MR, y, C.lightGrey, 1);

    // ── INVOICE DETAILS / BILLED BY / BILLED TO ─────────────────────────────
    y += 10;
    const c1 = ML, c2 = ML + 158, c3 = ML + 348;
    const secTopY = y;

    sf('bold', 7.5, C.grey);
    tx('INVOICE DETAILS', c1, y);
    y += 12;

    const infoRow = (lbl, val, xx, yy) => {
      sf('normal', 7.5, C.grey);
      doc.text(lbl, xx, yy);
      doc.text(':', xx + 55, yy);
      sf('bold', 7.5, C.darkBlue);
      doc.text(val, xx + 62, yy);
    };

    infoRow('Invoice Number', invoiceNum, c1, y); y += 11;
    infoRow('Invoice Date',   invoiceDate, c1, y); y += 11;
    infoRow('Due Date',       dueDateStr,  c1, y); y += 11;
    infoRow('GSTIN',          '29FCLPB9057E1ZB', c1, y);

    let by = secTopY;
    sf('bold', 7.5, C.grey);
    tx('BILLED BY', c2, by);
    by += 12;
    sf('bold', 8.5, C.darkBlue);
    tx('Rexora - Dimensify3D', c2, by);
    by += 12;
    const billedBy = [
      'Proprietor: Mohammed Adil Betageri',
      'Mehaboob nagar shivalli plot',
      'gulganjikoppa, Dharwad, India - 580008',
      'Email: print.dimensify3d@gmail.com',
      'Phone: +91 90193 03569',
      'State Name: Karnataka, Code : 29'
    ];
    sf('normal', 7.5, C.darkBlue);
    billedBy.forEach(l => { tx(l, c2, by); by += 10; });

    let bt = secTopY;
    sf('bold', 7.5, C.grey);
    tx('BILLED TO', c3, bt);
    bt += 12;
    sf('bold', 8.5, C.darkBlue);
    tx('Customer Representative', c3, bt);
    bt += 12;
    sf('bold', 8, C.darkBlue);
    tx(custName, c3, bt);
    bt += 11;
    sf('normal', 7.5, C.darkBlue);
    const addrW = W - MR - c3 - 2;
    // FIX 1: address is already single-line, splitTextToSize handles wrapping for PDF column
    doc.splitTextToSize(custAddress, addrW).forEach(l => { tx(l, c3, bt); bt += 10; });
    tx('Email: ' + custEmail, c3, bt); bt += 10;
    tx('Phone: ' + custPhone, c3, bt); bt += 10;
    tx('State Name: ' + custState, c3, bt);

    y = Math.max(y, by, bt) + 16;
    ln(ML, y, W - MR, y, C.lightGrey, 1);

    // ── ITEMS TABLE ──────────────────────────────────────────────────────────
    y += 8;
    const tW    = W - ML - MR;
    const tNo   = ML;
    const tDesc = ML + 26;
    const tHSN  = ML + 196;
    const qtyR  = ML + 290;
    const priceR= ML + 370;
    const gstR  = ML + 450;
    const amtR  = W - MR;

    rx(ML, y, tW, 20, C.darkBlue);
    sf('bold', 8, C.white);
    tx('SI.NO',     tNo + 3,    y + 14);
    tx('Item',      tDesc + 2,  y + 14);
    tx('HSN Code',  tHSN + 2,   y + 14);
    tx('Qty',       qtyR,       y + 14, { align: 'right' });
    tx('Price/Unit',priceR,     y + 14, { align: 'right' });
    tx('GST Amt',   gstR,       y + 14, { align: 'right' });
    tx('Amount',    amtR - 3,   y + 14, { align: 'right' });
    y += 20;

    items.forEach((item, idx) => {
      const rh = 18;
      if (idx % 2 === 1) rx(ML, y, tW, rh, C.veryLight);
      ln(ML, y + rh, W - MR, y + rh, C.lightGrey);
      sf('normal', 8, C.darkBlue);
      const q = parseFloat(item.qty) || 0;
      const p = parseFloat(item.price) || 0;
      const lineTaxable = q * p;
      const lineGst     = lineTaxable * gst.rate / 100;
      const lineAmt     = lineTaxable + lineGst;
      tx(String(idx + 1), tNo + 3, y + 13);
      const dl = doc.splitTextToSize(item.desc, 164);
      tx(dl[0], tDesc + 2, y + 13);
      tx(item.hsn || '-', tHSN + 2, y + 13);
      tx(String(q),        qtyR,    y + 13, { align: 'right' });
      tx(rs(p),            priceR,  y + 13, { align: 'right' });
      tx(rs(lineGst),      gstR,    y + 13, { align: 'right' });
      tx(rs(lineAmt),      amtR - 3,y + 13, { align: 'right' });
      y += rh;
    });

    const filler = Math.max(0, 5 - items.length);
    for (let i = 0; i < filler; i++) {
      if ((items.length + i) % 2 === 1) rx(ML, y, tW, 18, C.veryLight);
      ln(ML, y + 18, W - MR, y + 18, C.lightGrey);
      y += 18;
    }
    ln(ML, y, W - MR, y, C.darkBlue, 1);

    // ── TOTALS ───────────────────────────────────────────────────────────────
    y += 10;
    const tRX = W - MR - 220;

    const totRow = (lbl, val, bold, color) => {
      sf(bold ? 'bold' : 'normal', bold ? 9 : 8.5, color || C.darkBlue);
      tx(lbl, tRX, y, { align: 'right' });
      tx(val, W - MR, y, { align: 'right' });
      y += 12;
    };

    totRow('Taxable Value', rs(taxable));
    if (gst.type === 'igst') {
      totRow('IGST @ ' + gst.rate + '%', rs(gstTotal));
    } else {
      totRow('CGST @ ' + gst.cgst + '%', rs(taxable * gst.cgst / 100));
      totRow('SGST @ ' + gst.sgst + '%', rs(taxable * gst.sgst / 100));
    }
    y += 2;
    ln(tRX - 60, y, W - MR, y, C.darkBlue, 1);
    y += 8;
    totRow('Total Amount', rs(total), true);

    if (appliedAdvances.length > 0) {
      y += 2;
      appliedAdvances.forEach((adv) => {
        const label = adv.advId ? 'Advance Paid (' + adv.advId + ')' : 'Advance Paid';
        totRow(label, '- ' + rs(parseFloat(adv.amount)), false, C.green);
      });
      if (appliedAdvances.length > 1) {
        y += 2;
        totRow('Total Advance Paid', '- ' + rs(totalAdvance), false, C.green);
      }
      y += 2;
      ln(tRX - 60, y, W - MR, y, C.accent, 1);
      y += 8;
      totRow('Balance Payable', rs(balancePayable), true, C.accent);
    }

    y += 5;
    sf('bold', 8.5, C.darkBlue);
    const wordsAmt = totalAdvance > 0 ? balancePayable : total;
    tx('BALANCE IN WORDS: ' + numToWords(wordsAmt), ML, y);

    // ── SIGNATORY ────────────────────────────────────────────────────────────
    y += 10;
    const sigX = W - MR - 140;
    doc.addImage(sigImg, 'PNG', sigX + 15, y, 110, 42);
    y += 42;
    ln(sigX, y, W - MR, y, C.grey, 0.5);
    y += 10;
    sf('bold', 7.5, C.grey);
    tx('Authorised Signatory', sigX + 70, y, { align: 'center' });
    sf('normal', 7, C.grey);
    tx('Rexora - Dimensify3D', sigX + 70, y + 9, { align: 'center' });

    // ── BOTTOM DIVIDER ───────────────────────────────────────────────────────
    y += 26;
    ln(ML, y, W - MR, y, C.lightGrey, 1);
    y += 12;

    // ── BANK ACCOUNT DETAILS ─────────────────────────────────────────────────
    // FIX 5: Increase font sizes so content fills the page
    const fullW = W - ML - MR;

    sf('bold', 9, C.grey);
    tx('BANK ACCOUNT DETAILS', ML, y);
    y += 13;

    const bCol1 = ML;
    const bCol2 = ML + fullW * 0.5;

    const bRow = (lbl, val, col, yy) => {
      sf('normal', 8.5, C.grey);
      doc.text(lbl, col, yy);
      sf('bold', 9, C.darkBlue);
      doc.text(val, col + 112, yy);
    };

    bRow('Account Name   :', 'Mohammed Adil Betageri',  bCol1, y);
    bRow('IFSC Code      :', 'KKBK0008191',              bCol2, y);
    y += 13;
    bRow('Account Number :', '7948603225',               bCol1, y);
    bRow('Bank           :', 'Kotak Mahindra Bank',      bCol2, y);
    y += 16;

    const qrStartY = y;
    if (qrData) {
      doc.addImage(qrData, 'PNG', bCol1, y, 62, 62);
      sf('bold', 8, C.grey);
      tx('Scan to pay via UPI', bCol1 + 68, y + 10);
      sf('normal', 7.5, C.grey);
      tx('9483914542@kotak811', bCol1 + 68, y + 22);
      tx('Max Rs.1 lakh per UPI transaction per day.', bCol1 + 68, y + 32);
      y = qrStartY + 68;
    }

    y += 10;
    const metaY = y;
    sf('bold', 8.5, C.grey);  tx('PAN CARD',            bCol1,         metaY);
    sf('bold', 8.5, C.grey);  tx('MODE/TERM OF PAYMENT',bCol1 + 90,    metaY);
    sf('bold', 8.5, C.grey);  tx('DISPATCHED THROUGH',  bCol1 + 260,   metaY);
    sf('bold', 8.5, C.grey);  tx('DESTINATION',         bCol1 + 370,   metaY);
    y += 12;
    sf('bold', 9, C.darkBlue);  tx('FCLPB9057E',                         bCol1,       y);
    sf('normal', 8.5, C.darkBlue); tx('20% Adv. & Balance On Completion', bCol1 + 90, y);
    sf('normal', 8.5, C.darkBlue); tx('By Road',                          bCol1 + 260,y);
    sf('normal', 8.5, C.darkBlue); tx('At Work Place',                    bCol1 + 370,y);
    y += 16;

    sf('bold', 8.5, C.grey);
    tx('TERMS OF DELIVERY', bCol1, y);
    y += 12;
    sf('normal', 8.5, C.darkBlue);
    tx('By Hand', bCol1, y);
    y += 18;

    // ── TERMS AND CONDITIONS ────────────────────────────────────────────────
    ln(ML, y, W - MR, y, C.lightGrey, 0.5);
    y += 12;

    sf('bold', 9, C.grey);
    tx('TERMS AND CONDITIONS', ML, y);
    y += 14;

    const termsColW   = (fullW - 14) / 2;
    const termsCol1X  = ML;
    const termsCol2X  = ML + termsColW + 14;

    const half = Math.ceil(TERMS_DATA.length / 2);
    const termsLeft  = TERMS_DATA.slice(0, half);
    const termsRight = TERMS_DATA.slice(half);

    // FIX 5: Increased font sizes for terms to fill the space
    const renderTermsCol = (data, startX, startY) => {
      let ty = startY;
      data.forEach(([heading, bullets]) => {
        sf('bold', 8.5, C.accent);
        tx(heading, startX, ty);
        ty += 12;
        bullets.forEach(b => {
          sf('normal', 8, C.darkBlue);
          doc.splitTextToSize(b, termsColW - 4).forEach(l => {
            tx(l, startX + 4, ty);
            ty += 10;
          });
        });
        ty += 4;
      });
      return ty;
    };

    const leftEndY  = renderTermsCol(termsLeft,  termsCol1X, y);
    const rightEndY = renderTermsCol(termsRight, termsCol2X, y);
    y = Math.max(leftEndY, rightEndY);

    // ── FOOTER ───────────────────────────────────────────────────────────────
    // FIX 5: Footer is placed immediately after terms content, touching the bottom
    y += 10;
    const footerY = y + 14;
    rx(ML - 2, footerY - 13, W - ML - MR + 4, 20, C.darkBlue);
    sf('normal', 8, C.white);
    tx(
      'For any enquiry, reach out via email at print.dimensify3d@gmail.com, call on +91 90193 03569',
      W / 2, footerY, { align: 'center' }
    );

    // Update PDF internal height to match actual content
    doc.internal.pageSize.height = footerY + 10;

    doc.save('Dimensify3D_Invoice_' + invoiceNum + '_' + invoiceDate.replace(/-/g, '') + '.pdf');
  };

  const formValid = isFormValid();
  const missingFields = getMissingFields();

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="tapq-admin">
      <header className="tapq-header">
        <img src={logo} alt="Dimensify3D Logo" className="tapq-logo-img" />
        <div>
          <h1>DIMENSIFY3D — Invoice Generator</h1>
          <p>Fill in the fields below to generate a professional invoice PDF</p>
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
            {/* FIX 1: Address as single-line input (not textarea) */}
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
              <select name="custState" value={formData.custState} onChange={handleFormChange}>
                {GST_STATES.map(([name, code]) => (
                  <option key={code} value={`${name}, Code : ${code}`}>{name} (Code : {code})</option>
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
              <label>Invoice Number *</label>
              <input
                type="text"
                name="invoiceNum"
                value={formData.invoiceNum}
                onChange={handleFormChange}
                placeholder="e.g. D3D-06122602"
              />
            </div>
            <div className="tapq-form-group">
              <label>Due Date (auto: +15 days)</label>
              <input type="date" value={dueDate} readOnly />
            </div>
            <div className="tapq-form-group">
              <label>Document Type</label>
              <select name="docType" value={formData.docType} onChange={handleFormChange}>
                <option value="TAX INVOICE">Tax Invoice</option>
                <option value="QUOTATION">Quotation</option>
                <option value="PROFORMA INVOICE">Proforma Invoice</option>
                <option value="ADVANCE PAYMENT RECEIPT">Advance Payment Receipt</option>
              </select>
            </div>
            <div className="tapq-form-group">
              <label>GST Type</label>
              <select name="gstType" value={formData.gstType} onChange={handleFormChange}>
                <option value="igst">IGST</option>
                <option value="cgst_sgst">CGST + SGST</option>
              </select>
            </div>
          </div>
          <div className="tapq-notice">
            Invoice Date is automatically set to <strong>today</strong>. Due Date is automatically set to <strong>15 days from today</strong>.
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
              const lineGst     = lineTaxable * gst.rate / 100;
              const lineAmt     = lineTaxable + lineGst;
              return (
                <div key={item.id} className="tapq-item-row">
                  <span className="tapq-item-sno">{idx + 1}</span>
                  <input
                    type="text"
                    placeholder="Item description"
                    value={item.desc}
                    onChange={(e) => handleItemChange(item.id, 'desc', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="HSN"
                    value={item.hsn}
                    onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)}
                  />
                  {/* FIX 2: Use NumInput to block scroll and remove default 0 */}
                  <NumInput
                    placeholder="Qty"
                    value={item.qty}
                    min="1"
                    onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                  />
                  <NumInput
                    placeholder="Price"
                    value={item.price}
                    min="0"
                    step="0.01"
                    onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                  />
                  <span className="tapq-calc-val">{lineGst.toFixed(2)}</span>
                  <span className="tapq-calc-val">{lineAmt.toFixed(2)}</span>
                  <button className="tapq-btn-remove" onClick={() => handleRemoveItem(item.id)}>×</button>
                </div>
              );
            })}
          </div>
          <button className="tapq-btn-add" onClick={handleAddItem}>+ Add Item</button>

          {formData.gstType === 'igst' && (
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
          {formData.gstType === 'cgst_sgst' && (
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
                <button className="tapq-btn-advance" onClick={handleOpenAdvanceSection}>
                  + Add Advance Payment
                </button>
              ) : (
                <div className="tapq-advance-box">
                  <div className="tapq-advance-header">
                    <span className="tapq-advance-label">Advance Payments</span>
                    <button className="tapq-advance-close" onClick={handleCloseAdvanceSection}>×</button>
                  </div>

                  {/* FIX 3: Styled advance entries */}
                  <div className="tapq-advance-entries">
                    {advanceEntries.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className={`tapq-advance-entry ${entry.applied ? 'tapq-advance-entry--applied' : ''}`}
                      >
                        <div className="tapq-advance-entry-label">
                          <span className="tapq-advance-entry-num">#{idx + 1}</span>
                          {entry.applied && entry.advId && (
                            <span className="tapq-advance-entry-id-badge">{entry.advId}</span>
                          )}
                        </div>

                        {entry.applied ? (
                          <div className="tapq-advance-applied-row">
                            <div className="tapq-advance-applied-info">
                              <span className="tapq-advance-applied-id">
                                {entry.advId || <em style={{ opacity: 0.5 }}>No ID</em>}
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
                              >✎</button>
                              <button
                                className="tapq-btn-remove-adv"
                                onClick={() => handleRemoveAdvanceEntry(entry.id)}
                                title="Remove"
                              >×</button>
                            </div>
                          </div>
                        ) : (
                          <div className="tapq-advance-input-group">
                            {/* FIX 3: Styled ID input */}
                            <div className="tapq-advance-id-wrapper">
                              <span className="tapq-advance-id-icon">🔖</span>
                              <input
                                type="text"
                                className="tapq-advance-id-input"
                                placeholder="Payment ID (e.g. TXN123)"
                                value={entry.advId}
                                onChange={(e) => handleAdvanceEntryChange(entry.id, 'advId', e.target.value)}
                              />
                            </div>
                            {/* FIX 3: Styled amount input */}
                            <div className="tapq-advance-input-row">
                              <span className="tapq-advance-prefix">Rs.</span>
                              <input
                                type="number"
                                className="tapq-advance-input"
                                placeholder="0.00"
                                value={entry.amount === '' ? '' : entry.amount}
                                min="0"
                                step="0.01"
                                onWheel={(e) => e.target.blur()}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                }}
                                onChange={(e) => handleAdvanceEntryChange(entry.id, 'amount', e.target.value)}
                              />
                            </div>
                            <div className="tapq-advance-entry-actions">
                              <button
                                className="tapq-btn-apply-adv"
                                disabled={!entry.amount || parseFloat(entry.amount) <= 0}
                                onClick={() => handleApplyAdvanceEntry(entry.id)}
                              >
                                ✓ Apply
                              </button>
                              {advanceEntries.length > 1 && (
                                <button
                                  className="tapq-btn-remove-adv"
                                  onClick={() => handleRemoveAdvanceEntry(entry.id)}
                                >×</button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {allApplied && (
                    <button className="tapq-btn-add-another-adv" onClick={handleAddAnotherAdvance}>
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
              {gst.type === 'igst' ? (
                <div className="tapq-total-row">
                  <span>IGST @ {gst.rate}%</span>
                  <span>Rs. {gstTotal.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="tapq-total-row">
                    <span>CGST @ {gst.cgst}%</span>
                    <span>Rs. {(taxable * gst.cgst / 100).toFixed(2)}</span>
                  </div>
                  <div className="tapq-total-row">
                    <span>SGST @ {gst.sgst}%</span>
                    <span>Rs. {(taxable * gst.sgst / 100).toFixed(2)}</span>
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
                    {adv.advId ? `Advance #${idx + 1} (${adv.advId})` : `Advance #${idx + 1}`}
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

        {/* FIX 4: Disabled state + tooltip showing missing fields */}
        <div className="tapq-generate-wrapper">
          <button
            className={`tapq-btn-generate ${!formValid ? 'tapq-btn-generate--disabled' : ''}`}
            onClick={generatePDF}
            disabled={!formValid}
            title={!formValid ? 'Fill all required fields to generate PDF' : 'Generate Invoice PDF'}
          >
            {formValid ? '⬇ Generate Invoice PDF' : '🔒 Fill Required Fields to Generate PDF'}
          </button>
        </div>
      </div>

      <div
        id="tapq-qr-hidden"
        ref={qrCanvasRef}
        style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
      ></div>
    </div>
  );
}