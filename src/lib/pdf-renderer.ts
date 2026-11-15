'use client';

export interface RenderedPage {
  pageNumber: number;
  dataUrl: string; // JPEG data url for AI prompt / analysis
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}

/**
 * Configure PDF.js worker in browser environment
 */
async function getPdfJs() {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Prefer local bundled worker for offline speed and reliability
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }
  return pdfjsLib;
}

/**
 * Render a single image file (PNG/JPG/WEBP) into a RenderedPage
 */
export async function renderImageFile(file: File): Promise<RenderedPage[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get 2D context from canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve([
          {
            pageNumber: 1,
            dataUrl,
            width: img.width,
            height: img.height,
            canvas,
          },
        ]);
      };
      img.onerror = () => reject(new Error('Không thể tải hình ảnh.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Render a PDF file into high-resolution canvas images (2.0x scale) per page
 */
export async function renderPdfFile(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<RenderedPage[]> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
  });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const renderedPages: RenderedPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    // 2.0x scale for visual clarity & accurate diagram cropping
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D context');

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    renderedPages.push({
      pageNumber: pageNum,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
      canvas,
    });

    if (onProgress) {
      onProgress(pageNum, numPages);
    }
  }

  return renderedPages;
}
