import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * AdminSoaPdf - PDF generation utility for Statement of Account
 * This component handles the PDF generation logic separately from the main UI
 */
export default function AdminSoaPdf() {
  // This component doesn't render anything visible
  // It serves as a container for the PDF generation functions
  return null;
}

/**
 * Generates a PDF from the statement data using html2canvas and jsPDF
 * @param {Object} state - The current state of the SOA
 * @param {React.RefObject} paperRef - Reference to the paper element to capture
 * @param {Function} setSaveStatus - Optional callback to update save status
 * @returns {Promise<void>}
 */
export const generatePDF = async (state, paperRef, setSaveStatus = null) => {
  try {
    // Dynamic import of html2canvas
    const html2canvas = (await import('html2canvas')).default;
    
    const paper = paperRef.current;
    if (!paper) {
      throw new Error('Paper element not found');
    }

    // Ensure fonts are loaded
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 80));

    // Capture the paper element as canvas
    const canvas = await html2canvas(paper, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      logging: false
    });

    // Convert canvas to image data
    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Create PDF document
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    });

    // Calculate dimensions to fit the image on the page
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = (pdfHeight - imgHeight * ratio) / 2;

    // Add image to PDF
    pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

    // Generate safe filename
    const safeName = (state.meta.soaNumber || 'statement').toString().replace(/[^a-z0-9\-_.]+/gi, '_');
    
    // Save the PDF
    pdf.save(safeName + '.pdf');

    return { success: true, filename: safeName + '.pdf' };
    
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error('Could not generate the PDF. Please try again — if it keeps failing, use your browser\'s Print option instead and choose "Save as PDF".');
  }
};

/**
 * Generates PDF with progress tracking
 * @param {Object} state - The current state of the SOA
 * @param {React.RefObject} paperRef - Reference to the paper element to capture
 * @param {Function} onProgress - Callback for progress updates
 * @param {Function} onError - Callback for error handling
 * @returns {Promise<void>}
 */
export const generatePDFWithProgress = async (state, paperRef, onProgress, onError) => {
  try {
    if (onProgress) onProgress(10, 'Initializing PDF generation...');
    
    const html2canvas = (await import('html2canvas')).default;
    
    if (onProgress) onProgress(25, 'Preparing document...');
    
    const paper = paperRef.current;
    if (!paper) {
      throw new Error('Paper element not found');
    }

    // Ensure fonts are loaded
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    if (onProgress) onProgress(40, 'Loading fonts...');

    await new Promise(resolve => setTimeout(resolve, 80));

    if (onProgress) onProgress(55, 'Capturing document as image...');

    const canvas = await html2canvas(paper, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      logging: false
    });

    if (onProgress) onProgress(75, 'Processing image...');

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    });

    if (onProgress) onProgress(85, 'Generating PDF...');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = (pdfHeight - imgHeight * ratio) / 2;

    pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

    if (onProgress) onProgress(95, 'Finalizing PDF...');

    const safeName = (state.meta.soaNumber || 'statement').toString().replace(/[^a-z0-9\-_.]+/gi, '_');
    pdf.save(safeName + '.pdf');

    if (onProgress) onProgress(100, 'PDF generated successfully!');

    return { success: true, filename: safeName + '.pdf' };

  } catch (error) {
    console.error('PDF generation failed:', error);
    if (onError) onError(error);
    throw error;
  }
};

/**
 * Generates PDF with custom filename
 * @param {Object} state - The current state of the SOA
 * @param {React.RefObject} paperRef - Reference to the paper element to capture
 * @param {string} customFilename - Custom filename for the PDF
 * @returns {Promise<void>}
 */
export const generatePDFWithCustomFilename = async (state, paperRef, customFilename) => {
  try {
    const html2canvas = (await import('html2canvas')).default;
    
    const paper = paperRef.current;
    if (!paper) {
      throw new Error('Paper element not found');
    }

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    await new Promise(resolve => setTimeout(resolve, 80));

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

    // Use custom filename or generate one
    const filename = customFilename 
      ? customFilename.toString().replace(/[^a-z0-9\-_.]+/gi, '_') + '.pdf'
      : (state.meta.soaNumber || 'statement').toString().replace(/[^a-z0-9\-_.]+/gi, '_') + '.pdf';
    
    pdf.save(filename);

    return { success: true, filename };

  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
};

/**
 * Preview PDF in new window (doesn't download)
 * @param {Object} state - The current state of the SOA
 * @param {React.RefObject} paperRef - Reference to the paper element to capture
 * @returns {Promise<Window|null>} - Returns the new window object or null if failed
 */
export const previewPDF = async (state, paperRef) => {
  try {
    const html2canvas = (await import('html2canvas')).default;
    
    const paper = paperRef.current;
    if (!paper) {
      throw new Error('Paper element not found');
    }

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    await new Promise(resolve => setTimeout(resolve, 80));

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

    // Open PDF in new window
    const pdfData = pdf.output('blob');
    const url = URL.createObjectURL(pdfData);
    const newWindow = window.open(url, '_blank');
    
    // Clean up URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    return newWindow;

  } catch (error) {
    console.error('PDF preview failed:', error);
    throw error;
  }
};