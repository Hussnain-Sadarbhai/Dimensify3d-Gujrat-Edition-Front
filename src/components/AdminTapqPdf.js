import jsPDF from "jspdf";
import logo from "../images/logo-1.png";
import signature from "../images/ADIL SIGN.png";

// ── CONSTANTS ────────────────────────────────────────────────────────────────
export const GST_STATES = [
  ["Jammu and Kashmir", "1"],
  ["Himachal Pradesh", "2"],
  ["Punjab", "3"],
  ["Chandigarh", "4"],
  ["Uttarakhand", "5"],
  ["Haryana", "6"],
  ["Delhi", "7"],
  ["Rajasthan", "8"],
  ["Uttar Pradesh", "9"],
  ["Bihar", "10"],
  ["Sikkim", "11"],
  ["Arunachal Pradesh", "12"],
  ["Nagaland", "13"],
  ["Manipur", "14"],
  ["Mizoram", "15"],
  ["Tripura", "16"],
  ["Meghalaya", "17"],
  ["Assam", "18"],
  ["West Bengal", "19"],
  ["Jharkhand", "20"],
  ["Odisha", "21"],
  ["Chhattisgarh", "22"],
  ["Madhya Pradesh", "23"],
  ["Gujarat", "24"],
  ["Dadra and Nagar Haveli and Daman and Diu", "26"],
  ["Maharashtra", "27"],
  ["Karnataka", "29"],
  ["Goa", "30"],
  ["Lakshadweep", "31"],
  ["Kerala", "32"],
  ["Tamil Nadu", "33"],
  ["Puducherry", "34"],
  ["Andaman and Nicobar Islands", "35"],
  ["Telangana", "36"],
  ["Andhra Pradesh", "37"],
  ["Ladakh", "38"],
  ["Other Territory", "97"],
  ["Centre Jurisdiction", "99"],
];

export const TERMS_DATA = [
  [
    "1. Design Responsibility",
    [
      "1. The customer is responsible for providing the correct and final 3D model (STL/OBJ format).",
      "2. Dimensify3D Printing Services is not liable for dimensional inaccuracies or design errors in customer provided files. Any design modification request after quotation approval may incur additional charges.",
      "3. If design correction or optimization is required, design fees will be quoted separately.",
    ],
  ],
  [
    "2. Material & Print Quality",
    [
      "1. Minor surface imperfections or layer lines are natural characteristics of FDM 3D printing.",
      "2. Exact color matching cannot be guaranteed due to filament batch variation.",
      "3. Dimensional tolerance will typically be within +/-0.3 mm.",
    ],
  ],
  [
    "3. Approval & Payment",
    [
      "1. Printing will commence only after advance 20% payment and final model approval.",
      "2. Payment once made is non-refundable after the printing process begins.",
      "3. Any additional work or reprinting due to design revisions will be billed separately.",
    ],
  ],
  [
    "4. Delivery & Shipping",
    [
      "1. Estimated delivery time is provided based on current queue and print complexity.",
      "2. Delivery delays due to machine maintenance, power failure, or unforeseen issues will be communicated promptly.",
    ],
  ],
  [
    "5. Cancellation & Refund Policy",
    [
      "1. Orders can be cancelled only before the printing process begins.",
      "2. Once printing starts, cancellation or refund will not be possible. If cancellation is made before printing, any CAD/model preparation charges will be deducted.",
    ],
  ],
  [
    "6. Reprint / Replacement Policy",
    [
      "1. Reprints are accepted only in case of manufacturing defects or printing errors from our side.",
      "2. Claims must be made within 15 days of delivery, along with photos and issue details.",
      "3. Replacement timeline will depend on workload and material availability.",
    ],
  ],
  [
    "7. Intellectual Property & Confidentiality",
    [
      "1. All customer designs are treated as confidential and not shared with any third party.",
      "2. Dimensify3D Printing Services does not claim ownership of customer-provided designs.",
      "3. The customer confirms that submitted designs do not infringe on any patents, trademarks, or copyrights.",
    ],
  ],
  [
    "8. General Terms",
    [
      "1. Prices are subject to change based on market material cost fluctuations.",
      "2. By approving the quotation, the customer agrees to all the above terms and conditions.",
    ],
  ],
];

export const INITIAL_FORM_DATA = {
  custName: "",
  custPhone: "",
  custAddress: "",
  custEmail: "",
  custState: "Karnataka, Code : 29",
  custGstin: "", // NEW — optional, shown in BILLED TO if present
  invoiceNum: "",
  docType: "TAX INVOICE",
  gstType: "igst",
  specialNotes: "", // NEW — optional, shown below AMOUNT IN WORDS if present
};

export const INITIAL_GST_RATES = {
  igstRate: 18,
  cgstRate: 9,
  sgstRate: 9,
};

// ── UTILITY FUNCTIONS ────────────────────────────────────────────────────────

export const pad = (n) => String(n).padStart(2, "0");

export const todayStr = () => {
  const d = new Date();
  return pad(d.getDate()) + "-" + pad(d.getMonth() + 1) + "-" + d.getFullYear();
};

export const numToWords = (n) => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  if (n === 0) return "Zero";
  function chunk(x) {
    if (x === 0) return "";
    if (x < 20) return ones[x] + " ";
    if (x < 100)
      return (
        tens[Math.floor(x / 10)] +
        " " +
        (ones[x % 10] ? ones[x % 10] + " " : "")
      );
    return (
      ones[Math.floor(x / 100)] + " Hundred " + (x % 100 ? chunk(x % 100) : "")
    );
  }
  let r = "";
  let x = Math.floor(n);
  if (x >= 10000000) {
    r += chunk(Math.floor(x / 10000000)) + "Crore ";
    x %= 10000000;
  }
  if (x >= 100000) {
    r += chunk(Math.floor(x / 100000)) + "Lakh ";
    x %= 100000;
  }
  if (x >= 1000) {
    r += chunk(Math.floor(x / 1000)) + "Thousand ";
    x %= 1000;
  }
  r += chunk(x);
  return r.trim() + " Rupees Only";
};

// ── FORM VALIDATION ──────────────────────────────────────────────────────────
// custGstin and specialNotes are intentionally NOT checked here — they stay
// fully optional and never affect form validity.

export const isFormValid = (formData, items) => {
  if (!formData.custName.trim()) return false;
  if (!formData.custPhone.trim()) return false;
  if (!formData.custAddress.trim()) return false;
  if (!formData.invoiceNum.trim()) return false;
  if (items.length === 0) return false;
  const hasInvalidItem = items.some(
    (item) => !item.desc.trim() || item.price <= 0 || item.qty <= 0,
  );
  if (hasInvalidItem) return false;
  return true;
};

export const getMissingFields = (formData, items) => {
  const missing = [];
  if (!formData.custName.trim()) missing.push("Customer Name");
  if (!formData.custPhone.trim()) missing.push("Phone");
  if (!formData.custAddress.trim()) missing.push("Address");
  if (!formData.invoiceNum.trim()) missing.push("Invoice/AP Number");
  if (items.length === 0) missing.push("At least one Item");
  else {
    items.forEach((item, idx) => {
      if (!item.desc.trim()) missing.push(`Item #${idx + 1} description`);
      if (item.price <= 0) missing.push(`Item #${idx + 1} price`);
    });
  }
  return missing;
};

// ── CALCULATIONS ────────────────────────────────────────────────────────────

export const getGstInfo = (gstType, gstRates) => {
  if (gstType === "igst") {
    return { type: "igst", rate: gstRates.igstRate, cgst: 0, sgst: 0 };
  } else {
    return {
      type: "cgst_sgst",
      rate: gstRates.cgstRate + gstRates.sgstRate,
      cgst: gstRates.cgstRate,
      sgst: gstRates.sgstRate,
    };
  }
};

export const calculateTotals = (items, gstType, gstRates, roundOffEntries) => {
  const gst = getGstInfo(gstType, gstRates);
  let taxable = 0;
  items.forEach((item) => {
    const q = parseFloat(item.qty) || 0;
    const p = parseFloat(item.price) || 0;
    taxable += q * p;
  });
  const gstTotal = (taxable * gst.rate) / 100;
  const total = taxable + gstTotal;

  // Round-off entries: each is applied with a sign ('+' or '-') and adjusts
  // the final total directly. Fixed label "Round off" — no payment ID.
  const appliedRoundOffs = (roundOffEntries || []).filter(
    (e) => e.applied && parseFloat(e.amount) > 0,
  );
  const totalRoundOff = appliedRoundOffs.reduce((sum, e) => {
    const amt = parseFloat(e.amount) || 0;
    return sum + (e.sign === "-" ? -amt : amt);
  }, 0);

  const finalTotal = total + totalRoundOff;
  const balancePayable = finalTotal;

  return {
    taxable,
    gstTotal,
    total,
    gst,
    totalRoundOff,
    finalTotal,
    balancePayable,
    appliedRoundOffs,
  };
};

// ── HSN / SAC HEADER LABEL ───────────────────────────────────────────────────
// Each item now carries its own `codeType` ("HSN" or "SAC"), chosen via the
// dropdown in the Items table. Since the PDF has a single shared column for
// this, the column header adapts to what the items actually contain:
//   - all items are HSN        -> "HSN Code"
//   - all items are SAC        -> "SAC Code"
//   - mixed HSN and SAC items  -> "HSN/SAC Code"
//   - no items                 -> "HSN Code" (safe default)
export const getCodeColumnLabel = (items) => {
  if (!items || items.length === 0) return "HSN Code";
  const types = new Set(items.map((item) => (item.codeType || "HSN")));
  if (types.size === 1) {
    const only = [...types][0];
    return only === "SAC" ? "SAC Code" : "HSN Code";
  }
  return "HSN/SAC Code";
};

// ── QR & SIGNATURE ──────────────────────────────────────────────────────────

export const generateQR = (text, qrCanvasRef) => {
  return new Promise((resolve) => {
    if (window.QRCode) {
      if (qrCanvasRef.current) {
        qrCanvasRef.current.innerHTML = "";
        new window.QRCode(qrCanvasRef.current, {
          text,
          width: 80,
          height: 80,
          correctLevel: window.QRCode.CorrectLevel.M,
        });
        setTimeout(() => {
          const canvas = qrCanvasRef.current?.querySelector("canvas");
          resolve(canvas ? canvas.toDataURL("image/png") : null);
        }, 400);
      }
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = () => {
      if (qrCanvasRef.current) {
        qrCanvasRef.current.innerHTML = "";
        new window.QRCode(qrCanvasRef.current, {
          text,
          width: 80,
          height: 80,
          correctLevel: window.QRCode.CorrectLevel.M,
        });
        setTimeout(() => {
          const canvas = qrCanvasRef.current?.querySelector("canvas");
          resolve(canvas ? canvas.toDataURL("image/png") : null);
        }, 400);
      }
    };
    document.head.appendChild(script);
  });
};

export const getSignatureDataURL = () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = signature;
  });
};

// ── PDF GENERATION ──────────────────────────────────────────────────────────

export const generatePDF = async (params) => {
  const {
    formData,
    items,
    gstRates,
    dueDate,
    totalRoundOff,
    balancePayable,
    total,
    qrData,
    sigImg,
    // NEW — when true, the PDF skips drawing the signature image and just
    // leaves the same reserved space blank, ready for a manual/wet
    // signature. Defaults to false so behaviour is unchanged unless the
    // "No Signature" checkbox on the form is ticked.
    noSignature,
  } = params;

  if (!isFormValid(formData, items)) return;

  const custName = formData.custName.trim() || "N/A";
  const custPhone = formData.custPhone.trim() || "N/A";
  const custAddress =
    formData.custAddress
      .trim()
      .replace(/[\r\n]+/g, " ")
      .replace(/\s{2,}/g, " ") || "N/A";
  const custEmail = formData.custEmail.trim() || "NA";
  const custState = formData.custState.trim() || "N/A";
  // NEW — optional fields. Both stay empty-string when not supplied, and
  // every render/height calc below treats "" as "not present" so the
  // document looks exactly as before whenever they're left blank.
  const custGstin = (formData.custGstin || "").trim();
  const specialNotes = (formData.specialNotes || "").trim();
  const invoiceNum = formData.invoiceNum.trim() || "D3D-XXXXXXXX";
  const invoiceDate = todayStr();
  const docType = formData.docType;

  // Column header for the HSN/SAC column — reflects what codeType(s) the
  // items actually use (see getCodeColumnLabel above). Everything else
  // about the table (columns, widths, row content) is unchanged.
  const codeColumnLabel = getCodeColumnLabel(items);

  let dueDateStr = "N/A";
  if (dueDate) {
    const d = new Date(dueDate);
    dueDateStr =
      pad(d.getDate()) + "-" + pad(d.getMonth() + 1) + "-" + d.getFullYear();
  }

  const gst = getGstInfo(formData.gstType, gstRates);

  const W = 595.28,
    ML = 28,
    MR = 28,
    MT = 0; // no top margin — header sits flush with page top

  const C = {
    darkBlue: [26, 35, 50],
    midBlue: [45, 74, 110],
    accent: [58, 123, 213],
    grey: [140, 155, 175],
    lightGrey: [225, 230, 238],
    veryLight: [245, 247, 251],
    white: [255, 255, 255],
    black: [0, 0, 0],
    red: [180, 40, 40],
    green: [30, 140, 80],
  };

  // ── HEADER CONSTANTS ─────────────────────────────────────────────────────
  // Fixed header band height — same for ALL document types
  // Enlarged to fit the bigger logo + brand text block requested.
  const HEADER_BAND_H = 110; // total header height in pt
  const LOGO_SIZE = 108; // logo width & height (square) — enlarged

  // Auto-scale doc title font so long titles never overflow into brand area.
  // Doc title is intentionally kept SMALL relative to the brand block now
  // (per reference design): "TAX INVOICE" / "QUOTATION" -> 15pt
  // "PROFORMA INVOICE" -> 13pt, "ADVANCE PAYMENT RECEIPT" -> shrink to fit
  const getDocTitleSize = (text) => {
    if (text.length <= 16) return 15;
    if (text.length <= 20) return 13;
    return 11; // "ADVANCE PAYMENT RECEIPT" (23 chars) fits at 11pt
  };
  const docTitleSize = getDocTitleSize(docType);

  // Rough character-per-line estimate used only for pre-sizing the page
  // height in simulateLayout() below — mirrors the style already used for
  // custAddress / terms bullet wrapping estimates elsewhere in this file.
  const estimateWrappedLines = (text, approxCharsPerLine) => {
    if (!text) return 0;
    return Math.max(1, Math.ceil(text.length / approxCharsPerLine));
  };

  const simulateLayout = () => {
    let sy = MT;

    // Header band (fixed height) + separator gap + post-separator gap
    sy += HEADER_BAND_H + 6 + 18;

    const addrLines = Math.ceil(custAddress.length / 38);
    // + one extra line if GSTIN is present under BILLED TO
    const btHeight =
      12 + 11 + addrLines * 10 + 10 + 10 + 10 + (custGstin ? 10 : 0);
    const byHeight = 12 + 6 * 10;
    const invoiceH = 12 + 4 * 11;
    sy += Math.max(invoiceH, byHeight, btHeight) + 8 + 1 + 18;

    sy += 16 + Math.max(items.length, 5) * 18 + 1;

    sy += 24;
    const gstRows = gst.type === "igst" ? 2 : 3;
    sy += gstRows * 12 + 8 + 1 + 10 + 10;
    if (params.appliedRoundOffs?.length > 0) {
      sy += params.appliedRoundOffs.length * 12 + 2;
      sy += 8 + 1 + 10 + 10;
    }
    sy += 3;
    // + extra room for the optional Special Notes block (label + wrapped
    // lines) rendered between "AMOUNT IN WORDS" and the signature block.
    if (specialNotes) {
      const notesW = W - ML - MR - 150; // mirrors sigX - ML - 10 at render time
      const charsPerLine = Math.max(20, Math.floor(notesW / 4.4));
      sy += 12 + 9 + estimateWrappedLines(specialNotes, charsPerLine) * 9;
    }
    sy += 8 + 42 + 8 + 8 + 7;
    sy += 22 + 1 + 10;

    sy += 10 + 10 + 9 + 12;
    if (qrData) sy += 60 + 6;
    else sy += 6;
    sy += 8 + 12 + 8 + 8 + 12;

    sy += 1 + 8 + 10;

    const fullW = W - ML - MR;
    const termsColW = (fullW - 14) / 2;
    const half = Math.ceil(TERMS_DATA.length / 2);
    const calcColHeight = (data) => {
      let h = 0;
      data.forEach(([, bullets]) => {
        h += 10;
        bullets.forEach((b) => {
          h += Math.ceil(b.length / 80) * 8.5;
        });
        h += 3;
      });
      return h;
    };
    const leftH = calcColHeight(TERMS_DATA.slice(0, half));
    const rightH = calcColHeight(TERMS_DATA.slice(half));
    sy += Math.max(leftH, rightH);

    // gap before footer + footer bar height + small trailing margin
    sy += 20 + 26 + 10;
    return sy;
  };

  const contentH = simulateLayout();
  // simulateLayout() already includes the footer bar and a small trailing
  // margin below it, so only a gentle extra buffer is needed here — the
  // previous "+100" was creating a large dead zone below the footer.
  const H = contentH + 22;

  const doc = new jsPDF({
    unit: "pt",
    format: [W, H],
    putOnlyUsedFonts: true,
  });
  doc.setFont("helvetica");

  const sf = (style, size, color) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const ln = (x1, y1, x2, y2, color, w) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(w || 0.5);
    doc.line(x1, y1, x2, y2);
  };
  const rx = (x, y, w, h, fill, stroke, lw) => {
    if (fill) {
      doc.setFillColor(...fill);
      doc.rect(x, y, w, h, "F");
    }
    if (stroke) {
      doc.setDrawColor(...stroke);
      doc.setLineWidth(lw || 0.5);
      doc.rect(x, y, w, h, "S");
    }
  };
  const rs = (v) => "Rs. " + Number(v).toFixed(2);
  const tx = (str, x, y, opts) => {
    doc.text(str, x, y, opts || {});
  };

  // ── PRELOAD LOGO AS BASE64 ────────────────────────────────────────────
  const getLogoDataURL = () =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
      img.src = logo;
    });

  const logoDataURL = await getLogoDataURL();

  // ── ═══════════════════════════════════════════════════════════════════
  //    STRUCTURED HEADER — identical layout for ALL document types
  //    Layout: [LOGO] [BRAND TEXT — BIG]          [DOC TITLE — SMALL]
  //    Everything is vertically centered within HEADER_BAND_H
  // ── ═══════════════════════════════════════════════════════════════════

  let y = MT;

  // Header band top Y = MT, bottom Y = MT + HEADER_BAND_H
  const headerTopY = MT;
  const headerMidY = headerTopY + HEADER_BAND_H / 2; // vertical center of band

  // ── Logo: vertically centered in header band ──────────────────────────
  const logoX = ML;
  const logoY = headerMidY - LOGO_SIZE / 2; // centered vertically
  if (logoDataURL) {
    doc.addImage(logoDataURL, "PNG", logoX, logoY, LOGO_SIZE, LOGO_SIZE);
  }

  // ── Brand text: stacked, tightly next to logo, vertically centered ────
  // Enlarged brand name + tagline to match reference design.
  const brandNameSize = 26;
  const taglineSize = 14;
  const brandLineGap = 6; // gap between name and tagline
  const brandBlockH = brandNameSize + brandLineGap + taglineSize;
  const brandTextX = logoX + LOGO_SIZE - 4; // slight overlap — brand text flush against logo

  // Baseline of brand name so the whole text block is vertically centered
  const brandNameBaselineY = headerMidY - brandBlockH / 2 + brandNameSize;
  const taglineBaselineY = brandNameBaselineY + brandLineGap + taglineSize;

  sf("bold", brandNameSize, C.darkBlue);
  tx("DIMENSIFY3D", brandTextX, brandNameBaselineY);

  sf("normal", taglineSize, C.grey);
  tx("3D Printing Services", brandTextX, taglineBaselineY);

  // ── Document title: right-aligned, small, vertically centered ─────────
  const docTitleBaselineY = headerMidY + docTitleSize / 2 - 2; // optical center

  sf("bold", docTitleSize, C.darkBlue);
  tx(docType, W - MR, docTitleBaselineY, { align: "right" });

  // ── Dark separator line below header ──────────────────────────────────
  y = headerTopY + HEADER_BAND_H + 6;
  ln(ML, y, W - MR, y, C.darkBlue, 1.5);
  y += 18;

  // ── ═══════════════════════════════════════════════════════════════════
  //    REST OF DOCUMENT (unchanged from original)
  // ── ═══════════════════════════════════════════════════════════════════

  const c1 = ML,
    c2 = ML + 158,
    c3 = ML + 348;
  const secTopY = y;

  // ── DETERMINE SECTION HEADING ──────────────────────────────────────────
  let detailsHeading = "INVOICE DETAILS";
  let numLabel = "Invoice Number";
  let dateLabel = "Invoice Date";
  let showDueDate = true;

  if (docType === "QUOTATION") {
    detailsHeading = "QUOTATION DETAILS";
    numLabel = "Quotation No";
    dateLabel = "Quotation Date";
    showDueDate = false;
  } else if (docType === "PROFORMA INVOICE") {
    detailsHeading = "PROFORMA INVOICE DETAILS";
    numLabel = "PI No";
    dateLabel = "PI Date";
    showDueDate = false;
  } else if (docType === "ADVANCE PAYMENT RECEIPT") {
    detailsHeading = "ADVANCE PAYMENT DETAILS";
    numLabel = "AP Number";
    dateLabel = "AP Date";
    showDueDate = false;
  }

  sf("bold", 7.5, C.grey);
  tx(detailsHeading, c1, y);
  y += 12;

  const infoRow = (lbl, val, xx, yy) => {
    sf("normal", 7.5, C.grey);
    doc.text(lbl, xx, yy);
    doc.text(":", xx + 55, yy);
    sf("bold", 7.5, C.darkBlue);
    doc.text(val, xx + 62, yy);
  };

  infoRow(numLabel, invoiceNum, c1, y);
  y += 9;
  infoRow(dateLabel, invoiceDate, c1, y);
  y += 9;

  if (showDueDate && docType === "TAX INVOICE") {
    infoRow("Due Date", dueDateStr, c1, y);
    y += 9;
  }

  infoRow("GSTIN", "29FCLPB9057E1ZB", c1, y);

  let by = secTopY;
  sf("bold", 7.5, C.grey);
  tx("BILLED BY", c2, by);
  by += 12;
  sf("bold", 8.5, C.darkBlue);
  tx("Rexora - Dimensify3D", c2, by);
  by += 12;
  const billedBy = [
    "Proprietor: Mohammed Adil Betageri",
    "Mehaboob nagar shivalli plot",
    "gulganjikoppa, Dharwad, India - 580008",
    "Email: print.dimensify3d@gmail.com",
    "Phone: +91 90193 03569",
    "State Name: Karnataka, Code : 29",
  ];
  sf("normal", 7.5, C.darkBlue);
  billedBy.forEach((l) => {
    tx(l, c2, by);
    by += 10;
  });

  let bt = secTopY;

  let billToLabel = "BILLED TO";
  if (docType === "ADVANCE PAYMENT RECEIPT") {
    billToLabel = "PAYMENT FROM";
  }

  sf("bold", 7.5, C.grey);
  tx(billToLabel, c3, bt);
  bt += 12;
  sf("bold", 8.5, C.darkBlue);
  tx(custName, c3, bt);
  bt += 11;
  sf("normal", 7.5, C.darkBlue);
  const addrW = W - MR - c3 - 2;
  doc.splitTextToSize(custAddress, addrW).forEach((l) => {
    tx(l, c3, bt);
    bt += 10;
  });
  tx("Email: " + custEmail, c3, bt);
  bt += 10;
  tx("Phone: " + custPhone, c3, bt);
  bt += 10;
  tx("State Name: " + custState, c3, bt);
  // ── Customer GSTIN (optional) — only rendered when supplied, everything
  //    above stays exactly as before when it's left blank.
  if (custGstin) {
    bt += 10;
    tx("GSTIN: " + custGstin, c3, bt);
  }

  y = Math.max(y, by, bt) + 12;
  ln(ML, y, W - MR, y, C.lightGrey, 1);

  y += 6;
  const tW = W - ML - MR;
  const tNo = ML;
  const tDesc = ML + 26;
  const tHSN = ML + 196;
  const qtyR = ML + 290;
  const priceR = ML + 370;
  const gstR = ML + 450;
  const amtR = W - MR;

  rx(ML, y, tW, 20, C.darkBlue);
  sf("bold", 8, C.white);
  tx("SI.NO", tNo + 3, y + 14);
  tx("Item", tDesc + 2, y + 14);
  // Column header now reflects whether items use HSN, SAC, or a mix of
  // both — see codeColumnLabel computed above from getCodeColumnLabel().
  tx(codeColumnLabel, tHSN + 2, y + 14);
  tx("Qty", qtyR, y + 14, { align: "right" });
  tx("Price/Unit", priceR, y + 14, { align: "right" });
  tx("GST Amt", gstR, y + 14, { align: "right" });
  tx("Amount", amtR - 3, y + 14, { align: "right" });
  y += 20;

  items.forEach((item, idx) => {
    const rh = 18;
    if (idx % 2 === 1) rx(ML, y, tW, rh, C.veryLight);
    ln(ML, y + rh, W - MR, y + rh, C.lightGrey);
    sf("normal", 8, C.darkBlue);
    const q = parseFloat(item.qty) || 0;
    const p = parseFloat(item.price) || 0;
    const lineTaxable = q * p;
    const lineGst = (lineTaxable * gst.rate) / 100;
    const lineAmt = lineTaxable + lineGst;
    tx(String(idx + 1), tNo + 3, y + 13);
    tx(doc.splitTextToSize(item.desc, 164)[0], tDesc + 2, y + 13);
    tx(item.hsn || "-", tHSN + 2, y + 13);
    tx(String(q), qtyR, y + 13, { align: "right" });
    tx(rs(p), priceR, y + 13, { align: "right" });
    tx(rs(lineGst), gstR, y + 13, { align: "right" });
    tx(rs(lineAmt), amtR - 3, y + 13, { align: "right" });
    y += rh;
  });

  const filler = Math.max(0, 5 - items.length);
  for (let i = 0; i < filler; i++) {
    if ((items.length + i) % 2 === 1) rx(ML, y, tW, 18, C.veryLight);
    ln(ML, y + 18, W - MR, y + 18, C.lightGrey);
    y += 18;
  }

  y += 12;
  ln(ML, y, W - MR, y, C.darkBlue, 1);
  y += 12;

  const tRX = W - MR - 220;
  const { taxable, gstTotal } = params;

  const totRow = (lbl, val, bold, color) => {
    sf(bold ? "bold" : "normal", bold ? 9 : 8.5, color || C.darkBlue);
    tx(lbl, tRX, y, { align: "right" });
    tx(val, W - MR, y, { align: "right" });
    y += 10;
  };

  totRow("Taxable Value", rs(taxable));
  if (gst.type === "igst") {
    totRow("IGST @ " + gst.rate + "%", rs(gstTotal));
  } else {
    totRow("CGST @ " + gst.cgst + "%", rs((taxable * gst.cgst) / 100));
    totRow("SGST @ " + gst.sgst + "%", rs((taxable * gst.sgst) / 100));
  }
  y += 12;
  ln(tRX - 60, y, W - MR, y, C.darkBlue, 1);
  y += 12;

  // Label switches to "Amount" once a round off is applied, otherwise stays
  // "Total Amount" — same rule as the on-screen totals grid.
  totRow(
    params.appliedRoundOffs?.length > 0 ? "Amount" : "Total Amount",
    rs(total),
    true,
  );

  // ── ROUND OFF ───────────────────────────────────────────────────────────
  // Every applied round-off entry renders as a single fixed "Round off" line
  // with a +/- sign, applied directly to the total (no advance/payment-ID
  // language). If any round-off was applied, the final row (previously
  // "Balance Payable") is now labeled "Total Amount" = final total.
  if (params.appliedRoundOffs?.length > 0) {
    y += 2;
    params.appliedRoundOffs.forEach((ro) => {
      const amt = parseFloat(ro.amount) || 0;
      const signStr = ro.sign === "-" ? "- " : "+ ";
      totRow("Round off", signStr + rs(amt), false, C.green);
    });
    y += 12;
    ln(tRX - 60, y, W - MR, y, C.accent, 1);
    y += 12;
    totRow("Total Amount", rs(balancePayable), true, C.accent);
  }

  y += 4;
  sf("bold", 8.5, C.darkBlue);
  const wordsAmt = params.appliedRoundOffs?.length > 0 ? balancePayable : total;

  let amountLabel = "AMOUNT IN WORDS: ";
  if (docType === "ADVANCE PAYMENT RECEIPT") {
    amountLabel = "ADVANCE AMOUNT IN WORDS: ";
  }

  tx(amountLabel + numToWords(wordsAmt), ML, y);

  const sigX = W - MR - 140;

  // ── SPECIAL NOTES (optional) ──────────────────────────────────────────
  // Rendered directly below "AMOUNT IN WORDS" only when the user supplied
  // something. When left blank, this block is skipped entirely and the
  // layout below (signature block) falls back exactly to its original
  // "y += 8" spacing, i.e. unchanged from before.
  if (specialNotes) {
    y += 12;
    sf("bold", 8, C.grey);
    tx("SPECIAL NOTES:", ML, y);
    y += 9;
    sf("normal", 8, C.darkBlue);
    const notesW = sigX - ML - 10; // keep clear of the signature block
    doc.splitTextToSize(specialNotes, notesW).forEach((l) => {
      tx(l, ML, y);
      y += 9;
    });
  }

  y += 8;
  // ── SIGNATURE (or blank box for manual signature) ─────────────────────
  // When the "No Signature" checkbox is checked (noSignature === true),
  // the saved signature image is intentionally NOT drawn. The same 44pt
  // of vertical space is still reserved below (via "y += 44"), so the
  // area above the "Authorised Signatory" line simply stays blank —
  // ready for a manual/wet signature. Nothing else about the layout,
  // the line, or the label below changes.
  if (sigImg && !noSignature) {
    doc.addImage(sigImg, "PNG", sigX + 10, y, 120, 44);
  }
  y += 44;
  ln(sigX, y, W - MR, y, C.grey, 0.5);
  y += 8;
  sf("bold", 7.5, C.grey);
  tx("Authorised Signatory", sigX + 70, y, { align: "center" });
  sf("normal", 7, C.grey);
  tx("Rexora - Dimensify3D", sigX + 70, y + 9, { align: "center" });

  y += 22;
  ln(ML, y, W - MR, y, C.lightGrey, 1);
  y += 10;

  const fullW = W - ML - MR;

  sf("bold", 9, C.grey);
  tx("BANK ACCOUNT DETAILS", ML, y);
  y += 11;

  const bCol1 = ML;
  const bCol2 = ML + fullW * 0.5;

  const bRow = (lbl, val, col, yy) => {
    sf("normal", 8.5, C.grey);
    doc.text(lbl, col, yy);
    sf("bold", 9, C.darkBlue);
    doc.text(val, col + 112, yy);
  };

  bRow("Account Name   :", "Mohammed Adil Betageri", bCol1, y);
  bRow("IFSC Code      :", "KKBK0008191", bCol2, y);
  y += 11;
  bRow("Account Number :", "7948603225", bCol1, y);
  bRow("Bank           :", "Kotak Mahindra Bank", bCol2, y);
  y += 14;

  const qrStartY = y;
  if (qrData) {
    doc.addImage(qrData, "PNG", bCol1, y, 62, 62);
    sf("bold", 8, C.grey);
    tx("Scan to pay via UPI", bCol1 + 68, y + 10);
    sf("normal", 7.5, C.grey);
    tx("9483914542@kotak811", bCol1 + 68, y + 22);
    tx("Max Rs.1 lakh per UPI transaction per day.", bCol1 + 68, y + 32);
    y = qrStartY + 68;
  }

  y += 8;
  const metaY = y;
  sf("bold", 8.5, C.grey);
  tx("PAN CARD", bCol1, metaY);
  sf("bold", 8.5, C.grey);
  tx("MODE/TERM OF PAYMENT", bCol1 + 90, metaY);
  sf("bold", 8.5, C.grey);
  tx("DISPATCHED THROUGH", bCol1 + 260, metaY);
  sf("bold", 8.5, C.grey);
  tx("DESTINATION", bCol1 + 370, metaY);
  y += 10;
  sf("bold", 9, C.darkBlue);
  tx("FCLPB9057E", bCol1, y);

  // ── MODE/TERM OF PAYMENT ────────────────────────────────────────────
  // Fixed to "20% Adv." for every document type — Tax Invoice, Quotation,
  // Proforma Invoice, and Advance Payment Receipt all show the same text.
  const paymentMode = "20% Adv.";

  sf("normal", 8.5, C.darkBlue);
  tx(paymentMode, bCol1 + 90, y);
  sf("normal", 8.5, C.darkBlue);
  tx("By Road", bCol1 + 260, y);
  sf("normal", 8.5, C.darkBlue);
  tx("At Work Place", bCol1 + 370, y);
  y += 14;

  sf("bold", 8.5, C.grey);
  tx("TERMS OF DELIVERY", bCol1, y);
  y += 10;
  sf("normal", 8.5, C.darkBlue);
  tx("By Hand", bCol1, y);
  y += 16;

  ln(ML, y, W - MR, y, C.lightGrey, 0.5);
  y += 10;

  sf("bold", 9, C.grey);
  tx("TERMS AND CONDITIONS", ML, y);
  y += 12;

  const termsColW = (fullW - 14) / 2;
  const termsCol1X = ML;
  const termsCol2X = ML + termsColW + 14;

  const half = Math.ceil(TERMS_DATA.length / 2);
  const termsLeft = TERMS_DATA.slice(0, half);
  const termsRight = TERMS_DATA.slice(half);

  const renderTermsCol = (data, startX, startY) => {
    let ty = startY;
    data.forEach(([heading, bullets]) => {
      sf("bold", 8.5, C.accent);
      tx(heading, startX, ty);
      ty += 10;
      bullets.forEach((b) => {
        sf("normal", 8, C.darkBlue);
        doc.splitTextToSize(b, termsColW - 4).forEach((l) => {
          tx(l, startX + 4, ty);
          ty += 8;
        });
      });
      ty += 3;
    });
    return ty;
  };

  const leftEndY = renderTermsCol(termsLeft, termsCol1X, y);
  const rightEndY = renderTermsCol(termsRight, termsCol2X, y);
  y = Math.max(leftEndY, rightEndY);

  // ── FOOTER ────────────────────────────────────────────────────────────
  y += 20;
  const footerBarH = 26;
  const footerTopY = y;
  const footerTextY = footerTopY + 17;

  rx(ML, footerTopY, W - ML - MR, footerBarH, C.darkBlue);
  sf("normal", 8, C.white);
  tx(
    "For any enquiry, reach out via email at print.dimensify3d@gmail.com, call on +91 90193 03569",
    ML + (W - ML - MR) / 2,
    footerTextY,
    { align: "center" },
  );

  // ── FILE NAMING BASED ON DOCUMENT TYPE ────────────────────────────────
  let fileName = "Dimensify3D_Invoice_";
  if (docType === "QUOTATION") {
    fileName = "Dimensify3D_Quotation_";
  } else if (docType === "PROFORMA INVOICE") {
    fileName = "Dimensify3D_ProformaInvoice_";
  } else if (docType === "ADVANCE PAYMENT RECEIPT") {
    fileName = "Dimensify3D_AdvancePayment_";
  }

  doc.save(
    fileName + invoiceNum + "_" + invoiceDate.replace(/-/g, "") + ".pdf",
  );
};