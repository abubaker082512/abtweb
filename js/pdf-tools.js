/* ==========================================================================
   ABT IT INNOVATIONS - CLIENT-SIDE PDF CONVERTER & EDITOR ENGINE
   Lazy-loads pdf-lib, pdf.js, and JSZip on demand for fast Core Web Vitals
   Modes: images-to-pdf | pdf-to-jpg | merge-pdf | split-pdf
   ========================================================================== */

(function () {
    'use strict';

    const scriptCache = {};
    function loadScript(url) {
        if (scriptCache[url]) return scriptCache[url];
        scriptCache[url] = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url;
            s.onload = resolve;
            s.onerror = () => reject(new Error('Failed to load ' + url));
            document.head.appendChild(s);
        });
        return scriptCache[url];
    }

    async function getPDFLib() {
        if (!window.PDFLib) {
            await loadScript('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js');
        }
        return window.PDFLib;
    }

    async function getPDFJS() {
        if (!window.pdfjsLib) {
            await loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        }
        return window.pdfjsLib;
    }

    async function getJSZip() {
        if (!window.JSZip) {
            await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
        }
        return window.JSZip;
    }

    function formatBytes(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + ' ' + sizes[i];
    }

    function showToast(msg) {
        let toast = document.getElementById('abtToolToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'abtToolToast';
            toast.className = 'tool-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 3400);
    }

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    // Convert any image file (including WebP) to PNG/JPG bytes for pdf-lib
    function imageFileToEmbeddable(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                const isJpeg = file.type === 'image/jpeg';
                if (isJpeg) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(async (blob) => {
                    URL.revokeObjectURL(url);
                    const bytes = new Uint8Array(await blob.arrayBuffer());
                    resolve({ bytes, isJpeg, width: canvas.width, height: canvas.height });
                }, isJpeg ? 'image/jpeg' : 'image/png', 0.92);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Could not read image ' + file.name));
            };
            img.src = url;
        });
    }

    // Parse range string like "1-3, 5, 8-10" into sorted unique 1-based page numbers
    function parsePageRanges(str, maxPages) {
        const set = new Set();
        const parts = str.split(',');
        for (const raw of parts) {
            const part = raw.trim();
            if (!part) continue;
            if (part.includes('-')) {
                const [aStr, bStr] = part.split('-');
                const a = Math.max(1, parseInt(aStr, 10));
                const b = Math.min(maxPages, parseInt(bStr, 10));
                if (!isNaN(a) && !isNaN(b) && a <= b) {
                    for (let p = a; p <= b; p++) set.add(p);
                }
            } else {
                const p = parseInt(part, 10);
                if (!isNaN(p) && p >= 1 && p <= maxPages) set.add(p);
            }
        }
        return Array.from(set).sort((a, b) => a - b);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('pdfToolApp');
        if (!root) return;

        const mode = root.dataset.mode; // 'images-to-pdf' | 'pdf-to-jpg' | 'merge-pdf' | 'split-pdf'
        const dropzone = root.querySelector('#toolDropzone');
        const fileInput = root.querySelector('#toolFileInput');
        const queueEl = root.querySelector('#fileQueue');
        const pagesGrid = root.querySelector('#pdfPagesGrid');
        const actionBar = root.querySelector('#toolActionBar');
        const statusEl = root.querySelector('#toolStatusText');
        const progressWrap = root.querySelector('#toolProgressWrap');
        const progressBar = root.querySelector('#toolProgressBar');
        const processBtn = root.querySelector('#btnProcessPdf');
        const secondaryBtn = root.querySelector('#btnSecondaryPdf');
        const clearBtn = root.querySelector('#btnClearAll');

        // Shared state
        let filesList = []; // For images-to-pdf and merge-pdf
        let activePdfBytes = null;
        let activePdfName = 'document';
        let activePdfPageCount = 0;
        let selectedPages = new Set(); // 1-based page numbers for split-pdf
        let renderedImages = []; // For pdf-to-jpg: { pageNum, blob, url, filename }

        function setProgress(pct) {
            if (!progressWrap || !progressBar) return;
            if (pct <= 0) {
                progressWrap.classList.remove('active');
                progressBar.style.width = '0%';
            } else {
                progressWrap.classList.add('active');
                progressBar.style.width = Math.min(100, pct) + '%';
            }
        }

        function enableDragReorder(container, listRef, onReorder) {
            let dragIdx = null;
            container.querySelectorAll('.file-card').forEach((card, idx) => {
                card.draggable = true;
                card.addEventListener('dragstart', () => {
                    dragIdx = idx;
                    card.classList.add('dragging');
                });
                card.addEventListener('dragend', () => {
                    card.classList.remove('dragging');
                    container.querySelectorAll('.file-card').forEach(c => c.classList.remove('drag-target'));
                });
                card.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    card.classList.add('drag-target');
                });
                card.addEventListener('dragleave', () => card.classList.remove('drag-target'));
                card.addEventListener('drop', (e) => {
                    e.preventDefault();
                    card.classList.remove('drag-target');
                    if (dragIdx === null || dragIdx === idx) return;
                    const moved = listRef.splice(dragIdx, 1)[0];
                    listRef.splice(idx, 0, moved);
                    onReorder();
                });
            });
        }

        /* ==============================================================
           MODE 1: IMAGES TO PDF
           ============================================================== */
        function renderImagesToPdfQueue() {
            queueEl.innerHTML = '';
            filesList.forEach((item, idx) => {
                const card = document.createElement('div');
                card.className = 'file-card';
                card.innerHTML = `
                    <div class="file-thumb-wrap" title="Drag card to reorder pages">
                        <span class="file-order-badge">${idx + 1}</span>
                        <button type="button" class="file-remove-btn" aria-label="Remove">&times;</button>
                        <img src="${item.url}" alt="${item.file.name}">
                    </div>
                    <div class="file-meta-name">${item.file.name}</div>
                    <div class="file-meta-stats">
                        <span>Page ${idx + 1}</span>
                        <span>${formatBytes(item.file.size)}</span>
                    </div>
                `;
                card.querySelector('.file-remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    URL.revokeObjectURL(item.url);
                    filesList.splice(idx, 1);
                    if (!filesList.length) clearAll();
                    else renderImagesToPdfQueue();
                });
                queueEl.appendChild(card);
            });
            enableDragReorder(queueEl, filesList, renderImagesToPdfQueue);
            statusEl.textContent = `${filesList.length} image${filesList.length > 1 ? 's' : ''} queued (drag cards to reorder)`;
        }

        async function runImagesToPdf() {
            if (!filesList.length) return;
            processBtn.disabled = true;
            setProgress(15);
            try {
                const { PDFDocument } = await getPDFLib();
                const pdfDoc = await PDFDocument.create();

                const pageSizeOpt = (root.querySelector('#optPageSize')?.value) || 'a4';
                const orientOpt = (root.querySelector('#optOrientation')?.value) || 'portrait';
                const marginOpt = parseInt(root.querySelector('#optMargin')?.value || '24', 10);

                const SIZES = {
                    a4: [595.28, 841.89],
                    letter: [612, 792]
                };

                for (let i = 0; i < filesList.length; i++) {
                    const emb = await imageFileToEmbeddable(filesList[i].file);
                    const pdfImg = emb.isJpeg
                        ? await pdfDoc.embedJpg(emb.bytes)
                        : await pdfDoc.embedPng(emb.bytes);

                    let pageW, pageH;
                    if (pageSizeOpt === 'fit') {
                        pageW = emb.width + marginOpt * 2;
                        pageH = emb.height + marginOpt * 2;
                    } else {
                        const base = SIZES[pageSizeOpt] || SIZES.a4;
                        pageW = orientOpt === 'landscape' ? base[1] : base[0];
                        pageH = orientOpt === 'landscape' ? base[0] : base[1];
                    }

                    const page = pdfDoc.addPage([pageW, pageH]);
                    const availW = Math.max(10, pageW - marginOpt * 2);
                    const availH = Math.max(10, pageH - marginOpt * 2);
                    const scale = Math.min(availW / emb.width, availH / emb.height);
                    const drawW = emb.width * scale;
                    const drawH = emb.height * scale;

                    page.drawImage(pdfImg, {
                        x: (pageW - drawW) / 2,
                        y: (pageH - drawH) / 2,
                        width: drawW,
                        height: drawH
                    });

                    setProgress(15 + Math.round(((i + 1) / filesList.length) * 75));
                }

                const pdfBytes = await pdfDoc.save();
                setProgress(100);
                triggerDownload(new Blob([pdfBytes], { type: 'application/pdf' }), `abtit-images-to-pdf-${Date.now()}.pdf`);
                showToast('PDF created and downloaded!');
            } catch (err) {
                showToast('Error creating PDF: ' + err.message);
            } finally {
                processBtn.disabled = false;
                setTimeout(() => setProgress(0), 600);
            }
        }

        /* ==============================================================
           MODE 2: MERGE PDF
           ============================================================== */
        function renderMergePdfQueue() {
            queueEl.innerHTML = '';
            let totalPages = 0;
            filesList.forEach((item, idx) => {
                totalPages += item.pageCount;
                const card = document.createElement('div');
                card.className = 'file-card';
                card.innerHTML = `
                    <div class="file-thumb-wrap" title="Drag card to reorder PDFs">
                        <span class="file-order-badge">${idx + 1}</span>
                        <button type="button" class="file-remove-btn" aria-label="Remove">&times;</button>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.6">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="8" y1="13" x2="16" y2="13"/>
                            <line x1="8" y1="17" x2="13" y2="17"/>
                        </svg>
                    </div>
                    <div class="file-meta-name" title="${item.file.name}">${item.file.name}</div>
                    <div class="file-meta-stats">
                        <span><strong>${item.pageCount}</strong> page${item.pageCount > 1 ? 's' : ''}</span>
                        <span>${formatBytes(item.file.size)}</span>
                    </div>
                `;
                card.querySelector('.file-remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    filesList.splice(idx, 1);
                    if (!filesList.length) clearAll();
                    else renderMergePdfQueue();
                });
                queueEl.appendChild(card);
            });
            enableDragReorder(queueEl, filesList, renderMergePdfQueue);
            statusEl.textContent = `${filesList.length} PDF${filesList.length > 1 ? 's' : ''} • ${totalPages} total pages (drag to reorder)`;
        }

        async function runMergePdf() {
            if (filesList.length < 2) {
                showToast('Please add at least 2 PDF files to merge.');
                return;
            }
            processBtn.disabled = true;
            setProgress(15);
            try {
                const { PDFDocument } = await getPDFLib();
                const merged = await PDFDocument.create();
                for (let i = 0; i < filesList.length; i++) {
                    const src = await PDFDocument.load(filesList[i].bytes);
                    const pages = await merged.copyPages(src, src.getPageIndices());
                    pages.forEach(p => merged.addPage(p));
                    setProgress(15 + Math.round(((i + 1) / filesList.length) * 80));
                }
                const outBytes = await merged.save();
                setProgress(100);
                triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), `abtit-merged-${Date.now()}.pdf`);
                showToast('Merged PDF downloaded!');
            } catch (err) {
                showToast('Error merging PDFs: ' + err.message);
            } finally {
                processBtn.disabled = false;
                setTimeout(() => setProgress(0), 600);
            }
        }

        /* ==============================================================
           MODE 3: PDF TO JPG / PNG
           ============================================================== */
        async function runPdfToJpg(file) {
            setProgress(10);
            statusEl.textContent = 'Loading PDF rendering engine...';
            pagesGrid.innerHTML = '';
            renderedImages.forEach(r => URL.revokeObjectURL(r.url));
            renderedImages = [];

            try {
                const pdfjsLib = await getPDFJS();
                const bytes = await file.arrayBuffer();
                activePdfBytes = bytes;
                activePdfName = file.name.replace(/\.pdf$/i, '');

                const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
                activePdfPageCount = pdf.numPages;

                const scaleVal = parseFloat(root.querySelector('#optScale')?.value || '2');
                const fmtVal = (root.querySelector('#optImgFormat')?.value) || 'jpg';
                const mime = fmtVal === 'png' ? 'image/png' : 'image/jpeg';
                const ext = fmtVal === 'png' ? 'png' : 'jpg';

                statusEl.textContent = `Rendering ${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''}...`;

                for (let p = 1; p <= pdf.numPages; p++) {
                    const page = await pdf.getPage(p);
                    const viewport = page.getViewport({ scale: scaleVal });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    await page.render({ canvasContext: ctx, viewport }).promise;

                    const blob = await new Promise(res => canvas.toBlob(res, mime, 0.92));
                    const url = URL.createObjectURL(blob);
                    const filename = `${activePdfName}-page-${p}.${ext}`;
                    renderedImages.push({ pageNum: p, blob, url, filename });

                    const card = document.createElement('div');
                    card.className = 'pdf-page-card';
                    card.innerHTML = `
                        <div class="pdf-page-thumb">
                            <img src="${url}" alt="Page ${p}">
                        </div>
                        <div class="pdf-page-label">Page ${p} • ${formatBytes(blob.size)}</div>
                        <button type="button" class="btn-tool-primary" style="width:100%; margin-top:0.55rem; padding:0.45rem 0.6rem; font-size:0.78rem;">Download</button>
                    `;
                    card.querySelector('button').addEventListener('click', (e) => {
                        e.stopPropagation();
                        triggerDownload(blob, filename);
                    });
                    pagesGrid.appendChild(card);

                    setProgress(10 + Math.round((p / pdf.numPages) * 90));
                }

                statusEl.textContent = `${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''} converted to ${ext.toUpperCase()}`;
                showToast(`Rendered ${pdf.numPages} pages!`);
            } catch (err) {
                showToast('Could not render PDF: ' + err.message);
            } finally {
                setTimeout(() => setProgress(0), 500);
            }
        }

        async function downloadAllRenderedZip() {
            if (!renderedImages.length) return;
            processBtn.disabled = true;
            const origLabel = processBtn.textContent;
            processBtn.textContent = 'Building ZIP...';
            try {
                const JSZip = await getJSZip();
                const zip = new JSZip();
                renderedImages.forEach(item => zip.file(item.filename, item.blob));
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                triggerDownload(zipBlob, `${activePdfName}-images.zip`);
                showToast('All pages downloaded as ZIP!');
            } catch (err) {
                showToast('ZIP export failed: ' + err.message);
            } finally {
                processBtn.disabled = false;
                processBtn.textContent = origLabel;
            }
        }

        /* ==============================================================
           MODE 4: SPLIT / EXTRACT PDF PAGES
           ============================================================== */
        const rangeInput = root.querySelector('#optPageRange');

        function syncSelectionUI() {
            pagesGrid.querySelectorAll('.pdf-page-card').forEach(card => {
                const p = parseInt(card.dataset.page, 10);
                card.classList.toggle('selected', selectedPages.has(p));
            });
            statusEl.textContent = `${selectedPages.size} of ${activePdfPageCount} pages selected`;
            if (rangeInput) {
                rangeInput.value = Array.from(selectedPages).sort((a, b) => a - b).join(', ');
            }
        }

        async function loadSplitPdf(file) {
            setProgress(10);
            statusEl.textContent = 'Generating page thumbnails...';
            pagesGrid.innerHTML = '';
            selectedPages.clear();

            try {
                const pdfjsLib = await getPDFJS();
                const bytes = await file.arrayBuffer();
                activePdfBytes = bytes;
                activePdfName = file.name.replace(/\.pdf$/i, '');

                const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
                activePdfPageCount = pdf.numPages;

                for (let p = 1; p <= pdf.numPages; p++) {
                    selectedPages.add(p);
                    const page = await pdf.getPage(p);
                    const viewport = page.getViewport({ scale: 0.45 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    await page.render({ canvasContext: ctx, viewport }).promise;

                    const card = document.createElement('div');
                    card.className = 'pdf-page-card selected';
                    card.dataset.page = p;
                    card.innerHTML = `
                        <span class="pdf-page-check">✓</span>
                        <div class="pdf-page-thumb"></div>
                        <div class="pdf-page-label">Page ${p}</div>
                    `;
                    card.querySelector('.pdf-page-thumb').appendChild(canvas);
                    card.addEventListener('click', () => {
                        if (selectedPages.has(p)) selectedPages.delete(p);
                        else selectedPages.add(p);
                        syncSelectionUI();
                    });
                    pagesGrid.appendChild(card);
                    setProgress(10 + Math.round((p / pdf.numPages) * 90));
                }
                syncSelectionUI();
            } catch (err) {
                showToast('Could not open PDF: ' + err.message);
            } finally {
                setTimeout(() => setProgress(0), 500);
            }
        }

        if (rangeInput) {
            rangeInput.addEventListener('change', () => {
                if (!activePdfPageCount) return;
                const parsed = parsePageRanges(rangeInput.value, activePdfPageCount);
                selectedPages = new Set(parsed);
                pagesGrid.querySelectorAll('.pdf-page-card').forEach(card => {
                    const p = parseInt(card.dataset.page, 10);
                    card.classList.toggle('selected', selectedPages.has(p));
                });
                statusEl.textContent = `${selectedPages.size} of ${activePdfPageCount} pages selected`;
            });
        }

        const btnSelectAll = root.querySelector('#btnSelectAllPages');
        const btnSelectNone = root.querySelector('#btnSelectNoPages');
        if (btnSelectAll) btnSelectAll.addEventListener('click', () => {
            for (let p = 1; p <= activePdfPageCount; p++) selectedPages.add(p);
            syncSelectionUI();
        });
        if (btnSelectNone) btnSelectNone.addEventListener('click', () => {
            selectedPages.clear();
            syncSelectionUI();
        });

        async function extractSelectedAsOnePdf() {
            if (!activePdfBytes || !selectedPages.size) {
                showToast('Select at least one page to extract.');
                return;
            }
            processBtn.disabled = true;
            setProgress(25);
            try {
                const { PDFDocument } = await getPDFLib();
                const src = await PDFDocument.load(activePdfBytes);
                const out = await PDFDocument.create();
                const indices = Array.from(selectedPages).sort((a, b) => a - b).map(p => p - 1);
                const copied = await out.copyPages(src, indices);
                copied.forEach(p => out.addPage(p));
                const bytes = await out.save();
                setProgress(100);
                triggerDownload(new Blob([bytes], { type: 'application/pdf' }), `${activePdfName}-extracted.pdf`);
                showToast(`Extracted ${indices.length} page${indices.length > 1 ? 's' : ''} into a new PDF!`);
            } catch (err) {
                showToast('Extraction failed: ' + err.message);
            } finally {
                processBtn.disabled = false;
                setTimeout(() => setProgress(0), 500);
            }
        }

        async function splitSelectedAsZip() {
            if (!activePdfBytes || !selectedPages.size) {
                showToast('Select at least one page to split.');
                return;
            }
            secondaryBtn.disabled = true;
            setProgress(15);
            try {
                const [{ PDFDocument }, JSZip] = await Promise.all([getPDFLib(), getJSZip()]);
                const src = await PDFDocument.load(activePdfBytes);
                const zip = new JSZip();
                const pages = Array.from(selectedPages).sort((a, b) => a - b);
                for (let i = 0; i < pages.length; i++) {
                    const pNum = pages[i];
                    const single = await PDFDocument.create();
                    const [copied] = await single.copyPages(src, [pNum - 1]);
                    single.addPage(copied);
                    const b = await single.save();
                    zip.file(`${activePdfName}-page-${pNum}.pdf`, b);
                    setProgress(15 + Math.round(((i + 1) / pages.length) * 80));
                }
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                setProgress(100);
                triggerDownload(zipBlob, `${activePdfName}-split-pages.zip`);
                showToast(`Split ${pages.length} pages into ZIP!`);
            } catch (err) {
                showToast('Split failed: ' + err.message);
            } finally {
                secondaryBtn.disabled = false;
                setTimeout(() => setProgress(0), 500);
            }
        }

        /* ==============================================================
           FILE INGESTION & SHARED EVENTS
           ============================================================== */
        let lastPdfFile = null;

        async function handleFiles(fileList) {
            const arr = Array.from(fileList);
            if (!arr.length) return;

            if (mode === 'images-to-pdf') {
                const imgs = arr.filter(f => f.type.startsWith('image/'));
                if (!imgs.length) return showToast('Please select JPG, PNG, or WebP images.');
                imgs.forEach(file => filesList.push({ file, url: URL.createObjectURL(file) }));
                dropzone.classList.add('compact');
                actionBar.style.display = 'flex';
                renderImagesToPdfQueue();
            } else if (mode === 'merge-pdf') {
                const pdfs = arr.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
                if (!pdfs.length) return showToast('Please select PDF files.');
                setProgress(20);
                try {
                    const { PDFDocument } = await getPDFLib();
                    for (const file of pdfs) {
                        const bytes = await file.arrayBuffer();
                        const doc = await PDFDocument.load(bytes);
                        filesList.push({ file, bytes, pageCount: doc.getPageCount() });
                    }
                    dropzone.classList.add('compact');
                    actionBar.style.display = 'flex';
                    renderMergePdfQueue();
                } catch (err) {
                    showToast('Could not read PDF: ' + err.message);
                } finally {
                    setProgress(0);
                }
            } else if (mode === 'pdf-to-jpg') {
                const pdf = arr.find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
                if (!pdf) return showToast('Please select a PDF file.');
                lastPdfFile = pdf;
                dropzone.classList.add('compact');
                actionBar.style.display = 'flex';
                await runPdfToJpg(pdf);
            } else if (mode === 'split-pdf') {
                const pdf = arr.find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
                if (!pdf) return showToast('Please select a PDF file.');
                lastPdfFile = pdf;
                dropzone.classList.add('compact');
                actionBar.style.display = 'flex';
                await loadSplitPdf(pdf);
            }
        }

        function clearAll() {
            filesList.forEach(item => { if (item.url) URL.revokeObjectURL(item.url); });
            renderedImages.forEach(r => URL.revokeObjectURL(r.url));
            filesList = [];
            renderedImages = [];
            activePdfBytes = null;
            activePdfPageCount = 0;
            lastPdfFile = null;
            selectedPages.clear();
            if (queueEl) queueEl.innerHTML = '';
            if (pagesGrid) pagesGrid.innerHTML = '';
            if (actionBar) actionBar.style.display = 'none';
            if (dropzone) dropzone.classList.remove('compact');
            if (fileInput) fileInput.value = '';
        }

        if (dropzone && fileInput) {
            dropzone.addEventListener('click', (e) => {
                if (e.target.closest('button, input')) return;
                fileInput.click();
            });
            const chooseBtn = dropzone.querySelector('.btn-choose-files');
            if (chooseBtn) {
                chooseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    fileInput.click();
                });
            }
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length) handleFiles(fileInput.files);
                fileInput.value = '';
            });
            ['dragenter', 'dragover'].forEach(evt => {
                dropzone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    dropzone.classList.add('drag-over');
                });
            });
            ['dragleave', 'drop'].forEach(evt => {
                dropzone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    dropzone.classList.remove('drag-over');
                });
            });
            dropzone.addEventListener('drop', (e) => {
                if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
            });
        }

        // Re-render PDF-to-JPG if user changes DPI or format
        if (mode === 'pdf-to-jpg') {
            ['#optScale', '#optImgFormat'].forEach(sel => {
                const el = root.querySelector(sel);
                if (el) el.addEventListener('change', () => {
                    if (lastPdfFile) runPdfToJpg(lastPdfFile);
                });
            });
        }

        if (processBtn) {
            processBtn.addEventListener('click', () => {
                if (mode === 'images-to-pdf') runImagesToPdf();
                else if (mode === 'merge-pdf') runMergePdf();
                else if (mode === 'pdf-to-jpg') downloadAllRenderedZip();
                else if (mode === 'split-pdf') extractSelectedAsOnePdf();
            });
        }

        if (secondaryBtn && mode === 'split-pdf') {
            secondaryBtn.addEventListener('click', () => splitSelectedAsZip());
        }

        if (clearBtn) clearBtn.addEventListener('click', () => clearAll());
    });
})();
