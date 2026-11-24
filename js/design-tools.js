/* ==========================================================================
   ABT IT INNOVATIONS - CLIENT-SIDE DESIGN, PSD, VECTOR & PRO CONVERTERS
   100% Browser-Based | Lazy-loads ag-psd, imagetracerjs, heic2any, JSZip
   Modes: jpg-to-psd | psd-to-png | image-to-svg | svg-to-png | image-to-ico | heic-to-jpg
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
            s.onerror = () => reject(new Error('Failed to load library: ' + url));
            document.head.appendChild(s);
        });
        return scriptCache[url];
    }

    async function getAgPsd() {
        if (!window.agPsd) {
            await loadScript('https://cdn.jsdelivr.net/npm/ag-psd/dist/bundle.js');
        }
        return window.agPsd;
    }

    async function getImageTracer() {
        if (!window.ImageTracer) {
            await loadScript('https://cdn.jsdelivr.net/npm/imagetracerjs@1.2.6/imagetracer_v1.2.6.js');
        }
        return window.ImageTracer;
    }

    async function getHeic2Any() {
        if (!window.heic2any) {
            await loadScript('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js');
        }
        return window.heic2any;
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

    function loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => resolve({ img, url, w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Could not decode ' + file.name));
            };
            img.src = url;
        });
    }

    // Pure JS Multi-Size Binary ICO Encoder (PNG-compressed ICO frames per Microsoft spec)
    async function buildIcoBlob(pngFrames) {
        // pngFrames: [{ size, bytes: Uint8Array }]
        const count = pngFrames.length;
        const headerSize = 6 + count * 16;
        let totalSize = headerSize;
        pngFrames.forEach(f => { totalSize += f.bytes.length; });

        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);
        const u8 = new Uint8Array(buffer);

        // ICONDIR Header
        view.setUint16(0, 0, true);     // Reserved (0)
        view.setUint16(2, 1, true);     // Type (1 = ICO)
        view.setUint16(4, count, true); // Image count

        let offset = headerSize;
        pngFrames.forEach((frame, idx) => {
            const entryOff = 6 + idx * 16;
            const dim = frame.size >= 256 ? 0 : frame.size;
            view.setUint8(entryOff + 0, dim);                // Width (0 means 256)
            view.setUint8(entryOff + 1, dim);                // Height
            view.setUint8(entryOff + 2, 0);                  // Color palette
            view.setUint8(entryOff + 3, 0);                  // Reserved
            view.setUint16(entryOff + 4, 1, true);           // Color planes
            view.setUint16(entryOff + 6, 32, true);          // Bits per pixel
            view.setUint32(entryOff + 8, frame.bytes.length, true); // Data size
            view.setUint32(entryOff + 12, offset, true);     // Data offset

            u8.set(frame.bytes, offset);
            offset += frame.bytes.length;
        });

        return new Blob([buffer], { type: 'image/x-icon' });
    }

    function renderResizedPngBytes(img, size) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Center-fit with aspect ratio preserved
            const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;
            ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);

            canvas.toBlob(async (blob) => {
                const bytes = new Uint8Array(await blob.arrayBuffer());
                resolve({ size, blob, bytes, dataUrl: canvas.toDataURL('image/png') });
            }, 'image/png');
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('designToolApp');
        if (!root) return;

        const mode = root.dataset.mode;
        const dropzone = root.querySelector('#toolDropzone');
        const fileInput = root.querySelector('#toolFileInput');
        const queueEl = root.querySelector('#fileQueue');
        const actionBar = root.querySelector('#toolActionBar');
        const statusEl = root.querySelector('#toolStatusText');
        const progressWrap = root.querySelector('#toolProgressWrap');
        const progressBar = root.querySelector('#toolProgressBar');
        const primaryBtn = root.querySelector('#btnProcessDesign');
        const secondaryBtn = root.querySelector('#btnSecondaryDesign');
        const clearBtn = root.querySelector('#btnClearAll');

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

        /* ==============================================================
           MODE 1: JPG / PNG TO PSD (Single or Multi-Layer PSD)
           ============================================================== */
        let psdInputs = []; // { file, img, url, w, h }

        function renderJpgToPsdQueue() {
            queueEl.innerHTML = '';
            psdInputs.forEach((item, idx) => {
                const layerName = item.file.name.replace(/\.[^.]+$/, '');
                const card = document.createElement('div');
                card.className = 'file-card';
                card.innerHTML = `
                    <div class="file-thumb-wrap">
                        <span class="file-order-badge">L${idx + 1}</span>
                        <button type="button" class="file-remove-btn" aria-label="Remove">&times;</button>
                        <img src="${item.url}" alt="${item.file.name}">
                    </div>
                    <div class="file-meta-name" title="${item.file.name}">Layer: ${layerName}</div>
                    <div class="file-meta-stats">
                        <span>${item.w}×${item.h} px</span>
                        <span>${formatBytes(item.file.size)}</span>
                    </div>
                `;
                card.querySelector('.file-remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    URL.revokeObjectURL(item.url);
                    psdInputs.splice(idx, 1);
                    if (!psdInputs.length) clearAll();
                    else renderJpgToPsdQueue();
                });
                queueEl.appendChild(card);
            });
            statusEl.textContent = `${psdInputs.length} image${psdInputs.length > 1 ? 's' : ''} ready for Photoshop (.PSD) export`;
        }

        async function runJpgToPsd() {
            if (!psdInputs.length) return;
            primaryBtn.disabled = true;
            setProgress(20);
            try {
                const { writePsd } = await getAgPsd();
                const packMode = root.querySelector('#optPsdPack')?.value || 'multilayer';
                const includeBg = root.querySelector('#optPsdBg')?.checked;

                if (packMode === 'multilayer' || psdInputs.length === 1) {
                    const maxW = Math.max(...psdInputs.map(i => i.w));
                    const maxH = Math.max(...psdInputs.map(i => i.h));

                    const compCanvas = document.createElement('canvas');
                    compCanvas.width = maxW;
                    compCanvas.height = maxH;
                    const compCtx = compCanvas.getContext('2d');

                    const children = [];
                    if (includeBg) {
                        const bgC = document.createElement('canvas');
                        bgC.width = maxW;
                        bgC.height = maxH;
                        const bgCtx = bgC.getContext('2d');
                        bgCtx.fillStyle = '#ffffff';
                        bgCtx.fillRect(0, 0, maxW, maxH);
                        compCtx.drawImage(bgC, 0, 0);
                        children.push({ name: 'Background', canvas: bgC, top: 0, left: 0 });
                    }

                    psdInputs.forEach((item, idx) => {
                        const lc = document.createElement('canvas');
                        lc.width = item.w;
                        lc.height = item.h;
                        const lctx = lc.getContext('2d');
                        lctx.drawImage(item.img, 0, 0);
                        const left = Math.round((maxW - item.w) / 2);
                        const top = Math.round((maxH - item.h) / 2);
                        compCtx.drawImage(lc, left, top);
                        children.push({
                            name: item.file.name.replace(/\.[^.]+$/, '') || `Layer ${idx + 1}`,
                            canvas: lc,
                            top,
                            left
                        });
                    });

                    setProgress(70);
                    const psdObj = { width: maxW, height: maxH, canvas: compCanvas, children };
                    const buffer = writePsd(psdObj);
                    const outName = psdInputs.length === 1
                        ? psdInputs[0].file.name.replace(/\.[^.]+$/, '') + '.psd'
                        : `abtit-multilayer-${psdInputs.length}-layers.psd`;
                    setProgress(100);
                    triggerDownload(new Blob([buffer], { type: 'application/octet-stream' }), outName);
                    showToast(`Downloaded ${outName} (${formatBytes(buffer.byteLength)})!`);
                } else {
                    const JSZip = await getJSZip();
                    const zip = new JSZip();
                    for (let i = 0; i < psdInputs.length; i++) {
                        const item = psdInputs[i];
                        const c = document.createElement('canvas');
                        c.width = item.w;
                        c.height = item.h;
                        c.getContext('2d').drawImage(item.img, 0, 0);
                        const buf = writePsd({
                            width: item.w,
                            height: item.h,
                            canvas: c,
                            children: [{ name: item.file.name.replace(/\.[^.]+$/, ''), canvas: c, top: 0, left: 0 }]
                        });
                        zip.file(item.file.name.replace(/\.[^.]+$/, '') + '.psd', buf);
                        setProgress(20 + Math.round(((i + 1) / psdInputs.length) * 75));
                    }
                    const zipBlob = await zip.generateAsync({ type: 'blob' });
                    setProgress(100);
                    triggerDownload(zipBlob, `abtit-psd-files-${Date.now()}.zip`);
                    showToast('Downloaded all PSD files as ZIP!');
                }
            } catch (err) {
                showToast('PSD generation failed: ' + err.message);
            } finally {
                primaryBtn.disabled = false;
                setTimeout(() => setProgress(0), 600);
            }
        }

        /* ==============================================================
           MODE 2: PSD TO PNG / JPG / WEBP
           ============================================================== */
        let parsedPsds = []; // { file, w, h, layers, canvas, outBlob, outUrl, outName }

        async function processPsdFiles(files) {
            setProgress(15);
            statusEl.textContent = 'Loading PSD parser...';
            try {
                const { readPsd } = await getAgPsd();
                const fmt = root.querySelector('#optFormat')?.value || 'png';
                const mime = fmt === 'jpg' ? 'image/jpeg' : (fmt === 'webp' ? 'image/webp' : 'image/png');
                const ext = fmt;

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const buf = await file.arrayBuffer();
                    const psd = readPsd(buf);

                    let srcCanvas = psd.canvas;
                    if (!srcCanvas) {
                        // Composite visible layers if PSD was saved without compatibility composite
                        srcCanvas = document.createElement('canvas');
                        srcCanvas.width = psd.width;
                        srcCanvas.height = psd.height;
                        const ctx = srcCanvas.getContext('2d');
                        const drawChildren = (list) => {
                            if (!list) return;
                            list.forEach(layer => {
                                if (layer.hidden) return;
                                if (layer.children) drawChildren(layer.children);
                                else if (layer.canvas) {
                                    ctx.drawImage(layer.canvas, layer.left || 0, layer.top || 0);
                                }
                            });
                        };
                        drawChildren(psd.children);
                    }

                    const exportCanvas = document.createElement('canvas');
                    exportCanvas.width = srcCanvas.width;
                    exportCanvas.height = srcCanvas.height;
                    const ectx = exportCanvas.getContext('2d');
                    if (mime === 'image/jpeg') {
                        ectx.fillStyle = '#ffffff';
                        ectx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
                    }
                    ectx.drawImage(srcCanvas, 0, 0);

                    const blob = await new Promise(res => exportCanvas.toBlob(res, mime, 0.92));
                    const url = URL.createObjectURL(blob);
                    const layerNames = (psd.children || []).map(l => l.name || 'Layer').slice(0, 6);

                    parsedPsds.push({
                        file,
                        w: psd.width,
                        h: psd.height,
                        layerCount: (psd.children || []).length,
                        layerNames,
                        canvas: srcCanvas,
                        outBlob: blob,
                        outUrl: url,
                        outName: file.name.replace(/\.psd$/i, '') + '.' + ext
                    });
                    setProgress(15 + Math.round(((i + 1) / files.length) * 80));
                }

                renderPsdToPngQueue();
                setProgress(100);
                showToast(`Decoded ${files.length} PSD file${files.length > 1 ? 's' : ''}!`);
            } catch (err) {
                showToast('Could not parse PSD: ' + err.message);
            } finally {
                setTimeout(() => setProgress(0), 500);
            }
        }

        function renderPsdToPngQueue() {
            queueEl.innerHTML = '';
            parsedPsds.forEach((item, idx) => {
                const pills = item.layerNames.map(n => `<span class="psd-layer-pill">${n}</span>`).join('');
                const card = document.createElement('div');
                card.className = 'file-card';
                card.innerHTML = `
                    <div class="file-thumb-wrap">
                        <span class="file-order-badge">${idx + 1}</span>
                        <button type="button" class="file-remove-btn" aria-label="Remove">&times;</button>
                        <img src="${item.outUrl}" alt="${item.outName}">
                    </div>
                    <div class="file-meta-name" title="${item.outName}">${item.outName}</div>
                    <div class="file-meta-stats">
                        <span>${item.w}×${item.h} • ${item.layerCount} layer${item.layerCount === 1 ? '' : 's'}</span>
                        <span><strong>${formatBytes(item.outBlob.size)}</strong></span>
                    </div>
                    ${pills ? `<div class="psd-layer-list">${pills}</div>` : ''}
                    <div class="file-card-actions" style="margin-top:0.75rem;">
                        <button type="button" class="btn-tool-primary btn-dl-psd-img">Download</button>
                    </div>
                `;
                card.querySelector('.file-remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    URL.revokeObjectURL(item.outUrl);
                    parsedPsds.splice(idx, 1);
                    if (!parsedPsds.length) clearAll();
                    else renderPsdToPngQueue();
                });
                card.querySelector('.btn-dl-psd-img').addEventListener('click', () => {
                    triggerDownload(item.outBlob, item.outName);
                });
                queueEl.appendChild(card);
            });
            statusEl.textContent = `${parsedPsds.length} PSD file${parsedPsds.length > 1 ? 's' : ''} converted`;
            if (primaryBtn) primaryBtn.style.display = parsedPsds.length > 1 ? 'inline-flex' : 'none';
        }

        async function reExportParsedPsds() {
            if (!parsedPsds.length) return;
            const fmt = root.querySelector('#optFormat')?.value || 'png';
            const mime = fmt === 'jpg' ? 'image/jpeg' : (fmt === 'webp' ? 'image/webp' : 'image/png');
            for (const item of parsedPsds) {
                const c = document.createElement('canvas');
                c.width = item.canvas.width;
                c.height = item.canvas.height;
                const ctx = c.getContext('2d');
                if (mime === 'image/jpeg') {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, c.width, c.height);
                }
                ctx.drawImage(item.canvas, 0, 0);
                URL.revokeObjectURL(item.outUrl);
                item.outBlob = await new Promise(res => c.toBlob(res, mime, 0.92));
                item.outUrl = URL.createObjectURL(item.outBlob);
                item.outName = item.file.name.replace(/\.psd$/i, '') + '.' + fmt;
            }
            renderPsdToPngQueue();
        }

        /* ==============================================================
           MODE 3: IMAGE TO VECTOR (SVG)
           ============================================================== */
        let vectorSource = null; // { file, img, url, w, h }
        let lastSvgString = '';

        const VECTOR_PRESETS = {
            logo:      { numberofcolors: 8,  ltres: 0.8, qtres: 0.8, pathomit: 6,  blurradius: 0, strokewidth: 0, roundcoords: 1, colorsampling: 2, colorquantcycles: 3 },
            detailed:  { numberofcolors: 16, ltres: 0.5, qtres: 0.5, pathomit: 4,  blurradius: 0, strokewidth: 0, roundcoords: 1, colorsampling: 2, colorquantcycles: 3 },
            lineart:   { numberofcolors: 2,  ltres: 0.8, qtres: 0.8, pathomit: 6,  blurradius: 0, strokewidth: 0, roundcoords: 1, colorsampling: 2, colorquantcycles: 3 },
            poster:    { numberofcolors: 12, ltres: 1.4, qtres: 1.4, pathomit: 10, blurradius: 1, strokewidth: 0, roundcoords: 1, colorsampling: 2, colorquantcycles: 3 },
            pixel:     { numberofcolors: 16, ltres: 0.01, qtres: 0.01, pathomit: 0, blurradius: 0, strokewidth: 0, roundcoords: 0, rightangleenhance: true, colorsampling: 2, colorquantcycles: 3 }
        };

        function sanitizeTracedSvg(rawSvg, cw, ch) {
            // 1. Remove fully transparent paths (opacity="0") that ImageTracer emits for transparent PNG backgrounds
            let svg = rawSvg.replace(/<path[^>]*\bopacity="0(?:\.0+)?"[^>]*\/?>/gi, '');
            // 2. Ensure opening <svg> always has xmlns, width, height, and viewBox for 100% compatibility in browsers, Figma & Illustrator
            svg = svg.replace(/<svg\b[^>]*>/i, (tag) => {
                let out = tag;
                if (!/\bxmlns=/.test(out)) {
                    out = out.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                if (!/\bviewBox=/i.test(out)) {
                    out = out.replace('<svg', `<svg viewBox="0 0 ${cw} ${ch}"`);
                }
                if (!/\bwidth=/i.test(out)) {
                    out = out.replace('<svg', `<svg width="${cw}"`);
                }
                if (!/\bheight=/i.test(out)) {
                    out = out.replace('<svg', `<svg height="${ch}"`);
                }
                return out;
            });
            return svg;
        }

        async function runVectorTrace() {
            if (!vectorSource) return;
            setProgress(25);
            statusEl.textContent = 'Tracing vector paths...';
            try {
                const ImageTracer = await getImageTracer();
                const presetKey = root.querySelector('#optVectorPreset')?.value || 'logo';
                const colorsVal = parseInt(root.querySelector('#optColors')?.value || '8', 10);
                const base = Object.assign({}, VECTOR_PRESETS[presetKey] || VECTOR_PRESETS.logo);
                base.numberofcolors = colorsVal;
                base.viewbox = true;

                // Cap tracing resolution at 800px max side so browser stays snappy
                const maxSide = 800;
                const scale = Math.min(1, maxSide / Math.max(vectorSource.w, vectorSource.h));
                const cw = Math.max(1, Math.round(vectorSource.w * scale));
                const ch = Math.max(1, Math.round(vectorSource.h * scale));

                const canvas = document.createElement('canvas');
                canvas.width = cw;
                canvas.height = ch;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(vectorSource.img, 0, 0, cw, ch);
                const imgData = ctx.getImageData(0, 0, cw, ch);

                // Clean semi-transparent anti-aliased fringe pixels to avoid black halo artifacts
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] < 90) {
                        data[i] = 0;
                        data[i + 1] = 0;
                        data[i + 2] = 0;
                        data[i + 3] = 0;
                    } else if (data[i + 3] < 255) {
                        data[i + 3] = 255;
                    }
                }

                setProgress(65);
                const rawSvg = ImageTracer.imagedataToSVG(imgData, base);
                lastSvgString = sanitizeTracedSvg(rawSvg, cw, ch);

                const previewPanel = root.querySelector('#vectorPreviewPanel');
                const stage = root.querySelector('#vectorPreviewStage');
                const statsEl = root.querySelector('#svgStatsText');
                if (previewPanel && stage) {
                    previewPanel.classList.add('active');
                    stage.innerHTML = lastSvgString;
                    const pathCount = (lastSvgString.match(/<path/g) || []).length;
                    const byteSize = new Blob([lastSvgString]).size;
                    if (statsEl) {
                        statsEl.textContent = `Vector SVG Ready • ${pathCount.toLocaleString()} scalable paths • ${formatBytes(byteSize)}`;
                    }
                    statusEl.textContent = `Traced ${vectorSource.file.name} into ${pathCount.toLocaleString()} vector paths`;
                }
                setProgress(100);
            } catch (err) {
                showToast('Vector tracing failed: ' + err.message);
            } finally {
                setTimeout(() => setProgress(0), 500);
            }
        }

        // Vector backdrop switcher
        root.querySelectorAll('.backdrop-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                root.querySelectorAll('.backdrop-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const stage = root.querySelector('#vectorPreviewStage');
                if (!stage) return;
                stage.classList.remove('bg-light', 'bg-dark');
                if (btn.dataset.bg === 'light') stage.classList.add('bg-light');
                if (btn.dataset.bg === 'dark') stage.classList.add('bg-dark');
            });
        });

        const presetSel = root.querySelector('#optVectorPreset');
        const colorsRange = root.querySelector('#optColors');
        const colorsValEl = root.querySelector('#optColorsVal');
        if (presetSel) {
            presetSel.addEventListener('change', () => {
                const p = VECTOR_PRESETS[presetSel.value];
                if (p && colorsRange) {
                    colorsRange.value = p.numberofcolors;
                    if (colorsValEl) colorsValEl.textContent = p.numberofcolors + ' colors';
                }
                if (vectorSource) runVectorTrace();
            });
        }
        if (colorsRange) {
            colorsRange.addEventListener('input', () => {
                if (colorsValEl) colorsValEl.textContent = colorsRange.value + ' colors';
            });
            colorsRange.addEventListener('change', () => {
                if (vectorSource) runVectorTrace();
            });
        }

        /* ==============================================================
           MODE 4: SVG TO PNG / JPG / WEBP (High-DPI)
           ============================================================== */
        let svgItems = []; // { name, svgText, outBlob, outUrl, outName, outW, outH }

        function normalizeSvgForRaster(svgText) {
            const parser = new DOMParser();
            let doc = parser.parseFromString(svgText, 'image/svg+xml');
            let svgEl = doc.querySelector('svg');
            if (!svgEl || doc.querySelector('parsererror')) {
                // Fallback HTML parser for pasted inline SVG snippets missing xmlns
                doc = parser.parseFromString(svgText, 'text/html');
                svgEl = doc.querySelector('svg');
            }
            if (!svgEl) {
                throw new Error('No valid <svg> element found.');
            }
            if (!svgEl.getAttribute('xmlns')) {
                svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }

            let baseW = parseFloat(svgEl.getAttribute('width'));
            let baseH = parseFloat(svgEl.getAttribute('height'));
            const widthAttr = svgEl.getAttribute('width') || '';
            const heightAttr = svgEl.getAttribute('height') || '';
            if (widthAttr.includes('%')) baseW = NaN;
            if (heightAttr.includes('%')) baseH = NaN;

            const vb = svgEl.getAttribute('viewBox') || svgEl.getAttribute('viewbox');
            if (vb) {
                const parts = vb.trim().split(/[\s,]+/).map(Number);
                if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
                    if (!baseW || isNaN(baseW)) baseW = parts[2];
                    if (!baseH || isNaN(baseH)) baseH = parts[3];
                }
            }
            if (!baseW || isNaN(baseW)) baseW = 512;
            if (!baseH || isNaN(baseH)) baseH = 512;

            svgEl.setAttribute('width', String(Math.round(baseW)));
            svgEl.setAttribute('height', String(Math.round(baseH)));
            if (!vb) {
                svgEl.setAttribute('viewBox', `0 0 ${Math.round(baseW)} ${Math.round(baseH)}`);
            }

            const serialized = new XMLSerializer().serializeToString(svgEl);
            return { serialized, baseW: Math.round(baseW), baseH: Math.round(baseH) };
        }

        function renderSvgTextToRaster(svgText, baseName) {
            return new Promise((resolve, reject) => {
                const scaleMult = parseFloat(root.querySelector('#optSvgScale')?.value || '2');
                const fmt = root.querySelector('#optFormat')?.value || 'png';
                const bgMode = root.querySelector('#optSvgBgMode')?.value || 'transparent';
                const bgColor = root.querySelector('#optBgColor')?.value || '#ffffff';
                const mime = fmt === 'jpg' ? 'image/jpeg' : (fmt === 'webp' ? 'image/webp' : 'image/png');

                let norm;
                try {
                    norm = normalizeSvgForRaster(svgText);
                } catch (e) {
                    return reject(e);
                }

                const blob = new Blob([norm.serialized], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    const w = Math.max(1, Math.round(norm.baseW * scaleMult));
                    const h = Math.max(1, Math.round(norm.baseH * scaleMult));

                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    if (mime === 'image/jpeg' || bgMode === 'solid') {
                        ctx.fillStyle = bgColor;
                        ctx.fillRect(0, 0, w, h);
                    }
                    ctx.drawImage(img, 0, 0, w, h);
                    URL.revokeObjectURL(url);

                    canvas.toBlob((outBlob) => {
                        resolve({
                            outBlob,
                            outUrl: URL.createObjectURL(outBlob),
                            outName: `${baseName}@${scaleMult}x.${fmt}`,
                            outW: w,
                            outH: h
                        });
                    }, mime, 0.94);
                };
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error('Could not render SVG: ' + baseName));
                };
                img.src = url;
            });
        }

        async function processAllSvgs() {
            if (!svgItems.length) return;
            setProgress(25);
            try {
                for (let i = 0; i < svgItems.length; i++) {
                    const item = svgItems[i];
                    if (item.outUrl) URL.revokeObjectURL(item.outUrl);
                    const res = await renderSvgTextToRaster(item.svgText, item.name);
                    Object.assign(item, res);
                    setProgress(25 + Math.round(((i + 1) / svgItems.length) * 75));
                }
                renderSvgQueue();
            } catch (err) {
                showToast(err.message);
            } finally {
                setTimeout(() => setProgress(0), 500);
            }
        }

        function renderSvgQueue() {
            queueEl.innerHTML = '';
            svgItems.forEach((item, idx) => {
                const card = document.createElement('div');
                card.className = 'file-card';
                card.innerHTML = `
                    <div class="file-thumb-wrap">
                        <span class="file-order-badge">${idx + 1}</span>
                        <button type="button" class="file-remove-btn" aria-label="Remove">&times;</button>
                        <img src="${item.outUrl}" alt="${item.outName}">
                    </div>
                    <div class="file-meta-name">${item.outName}</div>
                    <div class="file-meta-stats">
                        <span>${item.outW}×${item.outH} px</span>
                        <span><strong>${formatBytes(item.outBlob.size)}</strong></span>
                    </div>
                    <div class="file-card-actions">
                        <button type="button" class="btn-tool-primary btn-dl-svg">Download</button>
                    </div>
                `;
                card.querySelector('.file-remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    URL.revokeObjectURL(item.outUrl);
                    svgItems.splice(idx, 1);
                    if (!svgItems.length) clearAll();
                    else renderSvgQueue();
                });
                card.querySelector('.btn-dl-svg').addEventListener('click', () => {
                    triggerDownload(item.outBlob, item.outName);
                });
                queueEl.appendChild(card);
            });
            statusEl.textContent = `${svgItems.length} SVG${svgItems.length > 1 ? 's' : ''} rendered at high DPI`;
            if (primaryBtn) primaryBtn.style.display = svgItems.length > 1 ? 'inline-flex' : 'none';
        }

        const btnRenderPastedSvg = root.querySelector('#btnRenderPastedSvg');
        const svgPasteArea = root.querySelector('#svgPasteArea');
        if (btnRenderPastedSvg && svgPasteArea) {
            btnRenderPastedSvg.addEventListener('click', async () => {
                const raw = svgPasteArea.value.trim();
                if (!raw.includes('<svg')) {
                    return showToast('Please paste valid <svg>...</svg> markup.');
                }
                svgItems.push({ name: `pasted-vector-${svgItems.length + 1}`, svgText: raw });
                dropzone.classList.add('compact');
                actionBar.style.display = 'flex';
                await processAllSvgs();
            });
        }

        /* ==============================================================
           MODE 5: IMAGE TO ICO & FAVICON KIT GENERATOR
           ============================================================== */
        let icoSource = null; // { file, img, url }
        let generatedIcoFrames = [];

        async function generateIcoPreviews() {
            if (!icoSource) return;
            const checks = Array.from(root.querySelectorAll('.ico-size-input:checked'));
            const sizes = checks.map(c => parseInt(c.value, 10)).sort((a, b) => a - b);
            if (!sizes.length) {
                showToast('Select at least one icon size.');
                return;
            }
            generatedIcoFrames = [];
            const grid = root.querySelector('#icoPreviewGrid');
            const snippetWrap = root.querySelector('#faviconSnippetBox');
            if (grid) {
                grid.style.display = 'flex';
                grid.innerHTML = '';
            }
            if (snippetWrap) snippetWrap.style.display = 'block';

            for (const sz of sizes) {
                const frame = await renderResizedPngBytes(icoSource.img, sz);
                generatedIcoFrames.push(frame);
                if (grid) {
                    const displaySz = Math.min(sz, 96);
                    const el = document.createElement('div');
                    el.className = 'ico-preview-item';
                    el.innerHTML = `
                        <div class="ico-preview-box">
                            <img src="${frame.dataUrl}" width="${displaySz}" height="${displaySz}" alt="${sz}x${sz} icon">
                        </div>
                        <span class="ico-preview-label">${sz}×${sz}</span>
                    `;
                    grid.appendChild(el);
                }
            }
            statusEl.textContent = `Multi-size ICO ready (${sizes.map(s => s + 'px').join(', ')})`;
        }

        root.querySelectorAll('.ico-size-input').forEach(chk => {
            chk.addEventListener('change', () => {
                if (icoSource) generateIcoPreviews();
            });
        });

        const copySnippetBtn = root.querySelector('#btnCopyFaviconHtml');
        if (copySnippetBtn) {
            copySnippetBtn.addEventListener('click', () => {
                const code = root.querySelector('#faviconHtmlCode')?.textContent || '';
                navigator.clipboard.writeText(code).then(() => showToast('HTML favicon tags copied!'));
            });
        }

        /* ==============================================================
           MODE 6: HEIC TO JPG / PNG / WEBP
           ============================================================== */
        let heicItems = []; // { file, outBlob, outUrl, outName }

        async function processHeicFiles(files) {
            setProgress(15);
            statusEl.textContent = 'Loading HEIC decoder (runs locally)...';
            try {
                const heic2any = await getHeic2Any();
                const fmt = root.querySelector('#optFormat')?.value || 'jpg';
                const quality = parseInt(root.querySelector('#optQuality')?.value || '88', 10) / 100;
                const toType = fmt === 'png' ? 'image/png' : (fmt === 'webp' ? 'image/webp' : 'image/jpeg');

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    statusEl.textContent = `Converting ${file.name} (${i + 1}/${files.length})...`;
                    const result = await heic2any({ blob: file, toType, quality });
                    const outBlob = Array.isArray(result) ? result[0] : result;
                    const outUrl = URL.createObjectURL(outBlob);
                    heicItems.push({
                        file,
                        outBlob,
                        outUrl,
                        outName: file.name.replace(/\.(heic|heif)$/i, '') + '.' + fmt
                    });
                    setProgress(15 + Math.round(((i + 1) / files.length) * 85));
                }
                renderHeicQueue();
                showToast(`Converted ${files.length} HEIC photo${files.length > 1 ? 's' : ''}!`);
            } catch (err) {
                showToast('HEIC conversion error: ' + (err.message || err));
            } finally {
                setTimeout(() => setProgress(0), 500);
            }
        }

        function renderHeicQueue() {
            queueEl.innerHTML = '';
            heicItems.forEach((item, idx) => {
                const card = document.createElement('div');
                card.className = 'file-card';
                card.innerHTML = `
                    <div class="file-thumb-wrap">
                        <span class="file-order-badge">${idx + 1}</span>
                        <button type="button" class="file-remove-btn" aria-label="Remove">&times;</button>
                        <img src="${item.outUrl}" alt="${item.outName}">
                    </div>
                    <div class="file-meta-name">${item.outName}</div>
                    <div class="file-meta-stats">
                        <span>${formatBytes(item.file.size)} → <strong>${formatBytes(item.outBlob.size)}</strong></span>
                    </div>
                    <div class="file-card-actions">
                        <button type="button" class="btn-tool-primary btn-dl-heic">Download</button>
                    </div>
                `;
                card.querySelector('.file-remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    URL.revokeObjectURL(item.outUrl);
                    heicItems.splice(idx, 1);
                    if (!heicItems.length) clearAll();
                    else renderHeicQueue();
                });
                card.querySelector('.btn-dl-heic').addEventListener('click', () => {
                    triggerDownload(item.outBlob, item.outName);
                });
                queueEl.appendChild(card);
            });
            statusEl.textContent = `${heicItems.length} HEIC photo${heicItems.length > 1 ? 's' : ''} converted`;
            if (primaryBtn) primaryBtn.style.display = heicItems.length > 1 ? 'inline-flex' : 'none';
        }

        /* ==============================================================
           SHARED FILE INGESTION & ACTION DISPATCH
           ============================================================== */
        async function handleFiles(fileList) {
            const arr = Array.from(fileList);
            if (!arr.length) return;

            if (mode === 'jpg-to-psd') {
                const imgs = arr.filter(f => f.type.startsWith('image/'));
                if (!imgs.length) return showToast('Please select JPG, PNG, or WebP images.');
                for (const f of imgs) {
                    const loaded = await loadImageFromFile(f);
                    psdInputs.push({ file: f, ...loaded });
                }
                dropzone.classList.add('compact');
                actionBar.style.display = 'flex';
                renderJpgToPsdQueue();
            } else if (mode === 'psd-to-png') {
                const psds = arr.filter(f => f.name.toLowerCase().endsWith('.psd') || f.type.includes('photoshop'));
                if (!psds.length) return showToast('Please select Adobe Photoshop (.psd) files.');
                dropzone.classList.add('compact');
                actionBar.style.display = 'flex';
                await processPsdFiles(psds);
            } else if (mode === 'image-to-svg') {
                const imgFile = arr.find(f => f.type.startsWith('image/'));
                if (!imgFile) return showToast('Please select a PNG, JPG, or WebP image.');
                if (vectorSource) URL.revokeObjectURL(vectorSource.url);
                const loaded = await loadImageFromFile(imgFile);
                vectorSource = { file: imgFile, ...loaded };
                dropzone.classList.add('compact');
                actionBar.style.display = 'flex';
                await runVectorTrace();
            } else if (mode === 'svg-to-png') {
                const svgs = arr.filter(f => f.name.toLowerCase().endsWith('.svg') || f.type === 'image/svg+xml');
                if (!svgs.length) return showToast('Please select .svg vector files.');
                for (const f of svgs) {
                    const text = await f.text();
                    svgItems.push({ name: f.name.replace(/\.svg$/i, ''), svgText: text });
                }
                dropzone.classList.add('compact');
                actionBar.style.display = 'flex';
                await processAllSvgs();
            } else if (mode === 'image-to-ico') {
                const imgFile = arr.find(f => f.type.startsWith('image/'));
                if (!imgFile) return showToast('Please select a PNG, JPG, WebP, or SVG image.');
                if (icoSource) URL.revokeObjectURL(icoSource.url);
                const loaded = await loadImageFromFile(imgFile);
                icoSource = { file: imgFile, ...loaded };
                dropzone.classList.add('compact');
                actionBar.style.display = 'flex';
                await generateIcoPreviews();
            } else if (mode === 'heic-to-jpg') {
                const heics = arr.filter(f => /\.(heic|heif)$/i.test(f.name) || f.type.includes('heic') || f.type.includes('heif'));
                if (!heics.length) return showToast('Please select Apple .heic or .heif photos.');
                dropzone.classList.add('compact');
                actionBar.style.display = 'flex';
                await processHeicFiles(heics);
            }
        }

        function clearAll() {
            psdInputs.forEach(i => URL.revokeObjectURL(i.url));
            parsedPsds.forEach(i => URL.revokeObjectURL(i.outUrl));
            svgItems.forEach(i => { if (i.outUrl) URL.revokeObjectURL(i.outUrl); });
            heicItems.forEach(i => URL.revokeObjectURL(i.outUrl));
            if (vectorSource) URL.revokeObjectURL(vectorSource.url);
            if (icoSource) URL.revokeObjectURL(icoSource.url);
            psdInputs = [];
            parsedPsds = [];
            svgItems = [];
            heicItems = [];
            vectorSource = null;
            icoSource = null;
            lastSvgString = '';
            generatedIcoFrames = [];
            if (queueEl) queueEl.innerHTML = '';
            const vp = root.querySelector('#vectorPreviewPanel');
            if (vp) vp.classList.remove('active');
            const ig = root.querySelector('#icoPreviewGrid');
            if (ig) { ig.innerHTML = ''; ig.style.display = 'none'; }
            const sb = root.querySelector('#faviconSnippetBox');
            if (sb) sb.style.display = 'none';
            if (actionBar) actionBar.style.display = 'none';
            if (dropzone) dropzone.classList.remove('compact');
            if (fileInput) fileInput.value = '';
        }

        // Control listeners
        if (mode === 'psd-to-png') {
            root.querySelector('#optFormat')?.addEventListener('change', reExportParsedPsds);
        }
        if (mode === 'svg-to-png') {
            ['#optSvgScale', '#optFormat', '#optSvgBgMode', '#optBgColor'].forEach(sel => {
                root.querySelector(sel)?.addEventListener('change', processAllSvgs);
            });
        }
        if (mode === 'heic-to-jpg') {
            const qr = root.querySelector('#optQuality');
            const qv = root.querySelector('#optQualityVal');
            if (qr && qv) qr.addEventListener('input', () => { qv.textContent = qr.value + '%'; });
        }

        // Primary & Secondary Button Actions
        if (primaryBtn) {
            primaryBtn.addEventListener('click', async () => {
                if (mode === 'jpg-to-psd') {
                    await runJpgToPsd();
                } else if (mode === 'image-to-svg') {
                    if (!lastSvgString) return;
                    const name = (vectorSource?.file.name.replace(/\.[^.]+$/, '') || 'vector') + '.svg';
                    triggerDownload(new Blob([lastSvgString], { type: 'image/svg+xml;charset=utf-8' }), name);
                    showToast('Downloaded ' + name);
                } else if (mode === 'image-to-ico') {
                    if (!generatedIcoFrames.length) return;
                    const icoBlob = await buildIcoBlob(generatedIcoFrames);
                    triggerDownload(icoBlob, 'favicon.ico');
                    showToast(`Downloaded multi-size favicon.ico (${formatBytes(icoBlob.size)})!`);
                } else if (mode === 'psd-to-png' || mode === 'svg-to-png' || mode === 'heic-to-jpg') {
                    const list = mode === 'psd-to-png' ? parsedPsds : (mode === 'svg-to-png' ? svgItems : heicItems);
                    if (!list.length) return;
                    const JSZip = await getJSZip();
                    const zip = new JSZip();
                    list.forEach(item => zip.file(item.outName, item.outBlob));
                    const zipBlob = await zip.generateAsync({ type: 'blob' });
                    triggerDownload(zipBlob, `abtit-${mode}-${Date.now()}.zip`);
                    showToast('ZIP archive downloaded!');
                }
            });
        }

        if (secondaryBtn) {
            secondaryBtn.addEventListener('click', async () => {
                if (mode === 'image-to-svg' && lastSvgString) {
                    navigator.clipboard.writeText(lastSvgString).then(() => showToast('SVG code copied to clipboard!'));
                } else if (mode === 'image-to-ico' && icoSource) {
                    secondaryBtn.disabled = true;
                    try {
                        const JSZip = await getJSZip();
                        const zip = new JSZip();
                        const icoBlob = await buildIcoBlob(generatedIcoFrames);
                        zip.file('favicon.ico', icoBlob);
                        const extraSizes = [
                            [16, 'favicon-16x16.png'],
                            [32, 'favicon-32x32.png'],
                            [180, 'apple-touch-icon.png'],
                            [192, 'android-chrome-192x192.png'],
                            [512, 'android-chrome-512x512.png']
                        ];
                        for (const [sz, fname] of extraSizes) {
                            const fr = await renderResizedPngBytes(icoSource.img, sz);
                            zip.file(fname, fr.blob);
                        }
                        const zipBlob = await zip.generateAsync({ type: 'blob' });
                        triggerDownload(zipBlob, 'abtit-favicon-kit.zip');
                        showToast('Full Favicon Kit (.ZIP) downloaded!');
                    } finally {
                        secondaryBtn.disabled = false;
                    }
                }
            });
        }

        if (clearBtn) clearBtn.addEventListener('click', clearAll);

        // Dropzone events
        if (dropzone && fileInput) {
            dropzone.addEventListener('click', (e) => {
                if (e.target.closest('button, input')) return;
                fileInput.click();
            });
            dropzone.querySelector('.btn-choose-files')?.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length) handleFiles(fileInput.files);
                fileInput.value = '';
            });
            ['dragenter', 'dragover'].forEach(evt => {
                dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
            });
            ['dragleave', 'drop'].forEach(evt => {
                dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('drag-over'); });
            });
            dropzone.addEventListener('drop', (e) => {
                if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
            });
        }
    });
})();
