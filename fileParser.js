/* ===========================================
   File Parser Module
   =========================================== */

const FileParser = (() => {

  async function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    switch (ext) {
      case 'txt':
      case 'md':
        return readAsText(file);
      case 'pdf':
        return parsePDF(file);
      case 'docx':
        return parseDOCX(file);
      default:
        throw new Error(`Unsupported format: .${ext}`);
    }
  }

  function readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  async function parsePDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    // pdf.js loaded via CDN
    if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js not loaded');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n\n';
    }
    return text.trim();
  }

  async function parseDOCX(file) {
    const arrayBuffer = await file.arrayBuffer();
    // mammoth.js loaded via CDN
    if (typeof mammoth === 'undefined') throw new Error('Mammoth.js not loaded');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  function readAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve({ data: base64, mimeType: file.type });
      };
      reader.onerror = () => reject(new Error('Falha ao ler imagem'));
      reader.readAsDataURL(file);
    });
  }

  return { parseFile, readAsBase64 };
})();
