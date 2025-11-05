import * as pdfjsLib from './pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';

let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumPending = null;
let annotations = [];

const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('file-input');
const controls = document.getElementById('controls');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');
const textLayerDiv = document.getElementById('text-layer');

function renderPage(num) {
  pageIsRendering = true;

  pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderCtx = {
      canvasContext: ctx,
      viewport: viewport
    };

    page.render(renderCtx).promise.then(() => {
      pageIsRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });

    pageNumSpan.textContent = num;

    // Render text layer
    page.getTextContent().then(textContent => {
      while (textLayerDiv.firstChild) {
        textLayerDiv.removeChild(textLayerDiv.firstChild);
      }

      textLayerDiv.style.width = canvas.width + 'px';
      textLayerDiv.style.height = canvas.height + 'px';

      pdfjsLib.renderTextLayer({
        textContent,
        container: textLayerDiv,
        viewport,
        textDivs: []
      });
    });
  });
}

function queueRenderPage(num) {
  if (pageIsRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

document.getElementById('prev').addEventListener('click', () => {
  if (pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
});

document.getElementById('next').addEventListener('click', () => {
  if (pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type === 'application/pdf') {
    const reader = new FileReader();
    reader.onload = function () {
      const typedarray = new Uint8Array(this.result);
      pdfjsLib.getDocument(typedarray).promise.then(pdfDoc_ => {
        pdfDoc = pdfDoc_;
        pageNum = 1;
        pageCountSpan.textContent = pdfDoc.numPages;
        controls.style.display = 'block';
        renderPage(pageNum);
      }).catch(err => {
        console.error('Error al cargar el PDF:', err.message);
      });
    };
    reader.readAsArrayBuffer(file);
  }
});

// Subrayar texto seleccionado
document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (selectedText.length > 0 && textLayerDiv.contains(range.startContainer)) {
      const span = document.createElement('span');
      span.className = 'highlighted';
      span.textContent = selectedText;
      range.deleteContents();
      range.insertNode(span);
      annotations.push({ page: pageNum, text: selectedText });
      selection.removeAllRanges();
    }
  }
});