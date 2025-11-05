// viewer.js
import * as pdfjsLib from './pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';

const url = '../assets/sample.pdf';

let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumPending = null;

const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');

const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');

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

pdfjsLib.getDocument(url).promise.then(pdfDoc_ => {
  pdfDoc = pdfDoc_;
  pageCountSpan.textContent = pdfDoc.numPages;
  renderPage(pageNum);
}).catch(err => {
  console.error('Error al cargar el PDF:', err.message);
});