/* ==========================================================================
   ABT IT INNOVATIONS - CLIENT-SIDE IMAGE CONVERTER / COMPRESSOR / RESIZER
   100% Browser-Based HTML5 Canvas Engine + Interactive Before/After Slider
   ========================================================================== */

(function () {
    'use strict';

    const MIME_MAP = {
        webp: { mime: 'image/webp', ext: 'webp', label: 'WebP', lossy: true },
        jpg:  { mime: 'image/jpeg', ext: 'jpg',  label: 'JPG',  lossy: true },
        jpeg: { mime: 'image/jpeg', ext: 'jpg',  label: 'JPG',  lossy: true },
        png:  { mime: 'image/png',  ext: 'png',  label: 'PNG',  lossy: false }
    };

    let jszipPromise = null;
    function loadJSZip() {
        if (window.JSZip) return Promise.resolve(window.JSZip);
        if (!jszipPromise) {
            jszipPromise = new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
                s.onload = () => resolve(window.JSZip);
                s.onerror = () => reject(new Error('Failed to load JSZip'));
                document.head.appendChild(s);
            });
        }
        return jszipPromise;
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
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
        toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
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

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('imageToolApp');
        if (!root) return;

        const mode = root.dataset.mode || 'convert'; // 'convert' | 'compress' | 'resize'
        const defaultTo = (root.dataset.to || 'webp').toLowerCase();

        const dropzone = root.querySelector('#toolDropzone');
        const fileInput = root.querySelector('#toolFileInput');
        const formatSelect = root.querySelector('#optFormat');
        const qualityRange = root.querySelector('#optQuality');
        const qualityVal = root.querySelector('#optQualityVal');
        const bgColorInput = root.querySelector('#optBgColor');
        const bgGroup = root.querySelector('#bgColorGroup');
        const widthInput = root.querySelector('#optWidth');
        const heightInput = root.querySelector('#optHeight');
        const lockRatioInput = root.querySelector('#optLockRatio');
        const presetChips = root.querySelectorAll('.preset-chip');

        const queueEl = root.querySelector('#fileQueue');
        const actionBar = root.querySelector('#toolActionBar');
        const statusEl = root.querySelector('#toolStatusText');
        const progressWrap = root.querySelector('#toolProgressWrap');
        const progressBar = root.querySelector('#toolProgressBar');
        const convertBtn = root.querySelector('#btnProcessAll');
        const downloadAllBtn = root.querySelector('#btnDownloadZip');
        const clearBtn = root.querySelector('#btnClearAll');

        // Before / After Comparison Elements
        const comparePanel = root.querySelector('#comparePanel');
        const compareStage = root.querySelector('#compareStage');
        const compareBeforeImg = root.querySelector('#compareBeforeImg');
        const compareAfterImg = root.querySelector('#compareAfterImg');
        const compareAfterWrap = root.querySelector('#compareAfterWrap');
        const compareDivider = root.querySelector('#compareDivider');
        const compareBeforePill = root.querySelector('#compareBeforePill');
        const compareAfterPill = root.querySelector('#compareAfterPill');
        const compareSavingsBadge = root.querySelector('#compareSavingsBadge');

        let items = []; // { id, file, img, origUrl, origW, origH, outBlob, outUrl, outName, outW, outH }
        let activeCompareId = null;

        if (formatSelect && defaultTo && MIME_MAP[defaultTo]) {
            formatSelect.value = defaultTo;
        }

        function getTargetFormat(file) {
            const val = formatSelect ? formatSelect.value : defaultTo;
            if (val === 'original') {
                if (file.type === 'image/png') return 'png';
                if (file.type === 'image/webp') return 'webp';
                return 'jpg';
            }
            return MIME_MAP[val] ? val : 'webp';
        }

        function updateControlVisibility() {
            const val = formatSelect ? formatSelect.value : defaultTo;
            if (bgGroup) {
                bgGroup.style.display = (val === 'jpg' || val === 'jpeg') ? 'flex' : 'none';
            }
            if (qualityRange && qualityVal) {
                qualityVal.textContent = qualityRange.value + '%';
            }
        }
        updateControlVisibility();

        if (formatSelect) formatSelect.addEventListener('change', () => {
            updateControlVisibility();
            if (items.length) processAll();
        });

        if (qualityRange) {
            qualityRange.addEventListener('input', () => {
                if (qualityVal) qualityVal.textContent = qualityRange.value + '%';
            });
            qualityRange.addEventListener('change', () => {
                if (items.length) processAll();
            });
        }

        if (bgColorInput) {
            bgColorInput.addEventListener('change', () => {
                if (items.length) processAll();
            });
        }

        // Aspect ratio sync for Resize tool
        if (widthInput && heightInput) {
            widthInput.addEventListener('input', () => {
                if (lockRatioInput && lockRatioInput.checked && items.length) {
                    const first = items[0];
                    const w = parseInt(widthInput.value, 10);
                    if (w > 0 && first.origW > 0) {
                        heightInput.value = Math.round((w / first.origW) * first.origH);
                    }
                }
            });
            heightInput.addEventListener('input', () => {
                if (lockRatioInput && lockRatioInput.checked && items.length) {
                    const first = items[0];
                    const h = parseInt(heightInput.value, 10);
                    if (h > 0 && first.origH > 0) {
                        widthInput.value = Math.round((h / first.origH) * first.origW);
                    }
                }
            });
        }

        presetChips.forEach(chip => {
            chip.addEventListener('click', () => {
                presetChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                if (chip.dataset.w && widthInput) widthInput.value = chip.dataset.w;
                if (chip.dataset.h && heightInput) heightInput.value = chip.dataset.h;
                if (chip.dataset.quality && qualityRange) {
                    qualityRange.value = chip.dataset.quality;
                    if (qualityVal) qualityVal.textContent = chip.dataset.quality + '%';
                }
                if (items.length) processAll();
            });
        });

        // Before/After Slider Interaction
        if (compareStage) {
            let isDragging = false;
            const setSliderPos = (clientX) => {
                const rect = compareStage.getBoundingClientRect();
                let pct = ((clientX - rect.left) / rect.width) * 100;
                pct = Math.max(2, Math.min(98, pct));
                compareAfterWrap.style.clipPath = `inset(0 0 0 ${pct}%)`;
                compareDivider.style.left = pct + '%';
            };
            compareStage.addEventListener('pointerdown', (e) => {
                isDragging = true;
                compareStage.setPointerCapture(e.pointerId);
                setSliderPos(e.clientX);
            });
            compareStage.addEventListener('pointermove', (e) => {
                if (isDragging) setSliderPos(e.clientX);
            });
            compareStage.addEventListener('pointerup', () => { isDragging = false; });
            compareStage.addEventListener('pointercancel', () => { isDragging = false; });
        }

        function updateComparePanel(item) {
            if (!comparePanel || !item || !item.outUrl) return;
            activeCompareId = item.id;
            comparePanel.classList.add('active');
            compareBeforeImg.src = item.origUrl;
            compareAfterImg.src = item.outUrl;

            const origBytes = item.file.size;
            const outBytes = item.outBlob.size;
            const diffPct = Math.round(((origBytes - outBytes) / origBytes) * 100);

            compareBeforePill.textContent = `Original • ${formatBytes(origBytes)} (${item.origW}×${item.origH})`;
            compareAfterPill.textContent = `Output • ${formatBytes(outBytes)} (${item.outW}×${item.outH})`;

            if (diffPct > 0) {
                compareSavingsBadge.className = 'savings-badge';
                compareSavingsBadge.textContent = `↓ ${diffPct}% Smaller (${formatBytes(origBytes - outBytes)} saved)`;
            } else if (diffPct < 0) {
                compareSavingsBadge.className = 'savings-badge neutral';
                compareSavingsBadge.textContent = `Converted (${formatBytes(outBytes)})`;
            } else {
                compareSavingsBadge.className = 'savings-badge neutral';
                compareSavingsBadge.textContent = `Same size (${formatBytes(outBytes)})`;
            }
        }

        function loadImageFile(file) {
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

        async function addFiles(fileList) {
            const valid = Array.from(fileList).filter(f => f.type.startsWith('image/'));
            if (!valid.length) {
                showToast('Please select valid image files (PNG, JPG, WebP, GIF, BMP).');
                return;
            }

            for (const file of valid) {
                try {
                    const loaded = await loadImageFile(file);
                    items.push({
                        id: 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                        file,
                        img: loaded.img,
                        origUrl: loaded.url,
                        origW: loaded.w,
                        origH: loaded.h,
                        outBlob: null,
                        outUrl: null,
                        outName: '',
                        outW: loaded.w,
                        outH: loaded.h
                    });
                } catch (err) {
                    showToast(err.message);
                }
            }

            // Pre-populate resize dimensions from first uploaded image if empty
            if (mode === 'resize' && items.length && widthInput && heightInput && !widthInput.value) {
                widthInput.value = items[0].origW;
                heightInput.value = items[0].origH;
            }

            if (dropzone) dropzone.classList.add('compact');
            if (actionBar) actionBar.style.display = 'flex';
            await processAll();
        }

        function convertSingleItem(item) {
            return new Promise((resolve) => {
                const targetFmt = getTargetFormat(item.file);
                const cfg = MIME_MAP[targetFmt] || MIME_MAP.webp;
                const quality = qualityRange ? parseInt(qualityRange.value, 10) / 100 : 0.85;

                let targetW = item.origW;
                let targetH = item.origH;

                if (widthInput && heightInput) {
                    const reqW = parseInt(widthInput.value, 10);
                    const reqH = parseInt(heightInput.value, 10);
                    if (reqW > 0 && reqH > 0) {
                        targetW = reqW;
                        targetH = reqH;
                    } else if (reqW > 0) {
                        targetW = reqW;
                        targetH = Math.round((reqW / item.origW) * item.origH);
                    } else if (reqH > 0) {
                        targetH = reqH;
                        targetW = Math.round((reqH / item.origH) * item.origW);
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, targetW);
                canvas.height = Math.max(1, targetH);
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Fill background for JPEG since it has no alpha channel
                if (cfg.mime === 'image/jpeg') {
                    ctx.fillStyle = (bgColorInput && bgColorInput.value) ? bgColorInput.value : '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(item.img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (item.outUrl) URL.revokeObjectURL(item.outUrl);
                    const baseName = item.file.name.replace(/\.[^.]+$/, '');
                    item.outBlob = blob;
                    item.outUrl = URL.createObjectURL(blob);
                    item.outName = `${baseName}.${cfg.ext}`;
                    item.outW = canvas.width;
                    item.outH = canvas.height;
                    resolve(item);
                }, cfg.mime, cfg.lossy ? quality : undefined);
            });
        }

        async function processAll() {
            if (!items.length) return;
            if (progressWrap) progressWrap.classList.add('active');
            if (progressBar) progressBar.style.width = '10%';
            if (convertBtn) convertBtn.disabled = true;

            let totalOrig = 0;
            let totalOut = 0;

            for (let i = 0; i < items.length; i++) {
                await convertSingleItem(items[i]);
                totalOrig += items[i].file.size;
                totalOut += items[i].outBlob.size;
                if (progressBar) {
                    progressBar.style.width = Math.round(((i + 1) / items.length) * 100) + '%';
                }
            }

            renderQueue();
            const targetCompare = items.find(x => x.id === activeCompareId) || items[0];
            updateComparePanel(targetCompare);

            const savedPct = totalOrig > 0 ? Math.round(((totalOrig - totalOut) / totalOrig) * 100) : 0;
            if (statusEl) {
                statusEl.textContent = `${items.length} image${items.length > 1 ? 's' : ''} ready • ${formatBytes(totalOrig)} → ${formatBytes(totalOut)}` +
                    (savedPct > 0 ? ` (${savedPct}% saved)` : '');
            }

            if (convertBtn) convertBtn.disabled = false;
            if (downloadAllBtn) downloadAllBtn.style.display = items.length > 1 ? 'inline-flex' : 'none';
            setTimeout(() => {
                if (progressWrap) progressWrap.classList.remove('active');
            }, 600);
        }

        function renderQueue() {
            if (!queueEl) return;
            queueEl.innerHTML = '';

            items.forEach((item, idx) => {
                const origB = item.file.size;
                const outB = item.outBlob ? item.outBlob.size : origB;
                const pct = origB > 0 ? Math.round(((origB - outB) / origB) * 100) : 0;

                const card = document.createElement('div');
                card.className = 'file-card';
                card.innerHTML = `
                    <div class="file-thumb-wrap" title="Click to inspect in Before/After slider">
                        <span class="file-order-badge">${idx + 1}</span>
                        <button type="button" class="file-remove-btn" aria-label="Remove file">&times;</button>
                        <img src="${item.outUrl || item.origUrl}" alt="${item.outName || item.file.name}">
                    </div>
                    <div class="file-meta-name" title="${item.outName}">${item.outName}</div>
                    <div class="file-meta-stats">
                        <span>${formatBytes(origB)} → <strong>${formatBytes(outB)}</strong></span>
                        <span style="color: ${pct > 0 ? '#10b981' : 'var(--color-text-muted)'}; font-weight: 700;">
                            ${pct > 0 ? '-' + pct + '%' : item.outW + '×' + item.outH}
                        </span>
                    </div>
                    <div class="file-card-actions">
                        <button type="button" class="btn-tool-secondary btn-preview-item">Compare</button>
                        <button type="button" class="btn-tool-primary btn-dl-item">Download</button>
                    </div>
                `;

                card.querySelector('.file-remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    URL.revokeObjectURL(item.origUrl);
                    if (item.outUrl) URL.revokeObjectURL(item.outUrl);
                    items = items.filter(x => x.id !== item.id);
                    if (!items.length) {
                        clearAll();
                    } else {
                        renderQueue();
                        if (activeCompareId === item.id) updateComparePanel(items[0]);
                    }
                });

                card.querySelector('.file-thumb-wrap').addEventListener('click', () => {
                    updateComparePanel(item);
                    if (comparePanel) comparePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });

                card.querySelector('.btn-preview-item').addEventListener('click', () => {
                    updateComparePanel(item);
                    if (comparePanel) comparePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });

                card.querySelector('.btn-dl-item').addEventListener('click', () => {
                    if (item.outBlob) triggerDownload(item.outBlob, item.outName);
                });

                queueEl.appendChild(card);
            });
        }

        function clearAll() {
            items.forEach(item => {
                URL.revokeObjectURL(item.origUrl);
                if (item.outUrl) URL.revokeObjectURL(item.outUrl);
            });
            items = [];
            activeCompareId = null;
            if (queueEl) queueEl.innerHTML = '';
            if (comparePanel) comparePanel.classList.remove('active');
            if (actionBar) actionBar.style.display = 'none';
            if (dropzone) dropzone.classList.remove('compact');
            if (fileInput) fileInput.value = '';
        }

        // Event Bindings
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
                if (fileInput.files.length) addFiles(fileInput.files);
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
                if (e.dataTransfer && e.dataTransfer.files.length) {
                    addFiles(e.dataTransfer.files);
                }
            });
        }

        // Clipboard Paste (Ctrl+V)
        document.addEventListener('paste', (e) => {
            const clipItems = e.clipboardData && e.clipboardData.items;
            if (!clipItems) return;
            const pastedFiles = [];
            for (const ci of clipItems) {
                if (ci.type.startsWith('image/')) {
                    const f = ci.getAsFile();
                    if (f) pastedFiles.push(f);
                }
            }
            if (pastedFiles.length) {
                addFiles(pastedFiles);
                showToast('Pasted image from clipboard!');
            }
        });

        if (convertBtn) convertBtn.addEventListener('click', () => processAll());
        if (clearBtn) clearBtn.addEventListener('click', () => clearAll());

        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', async () => {
                if (!items.length) return;
                downloadAllBtn.disabled = true;
                const origText = downloadAllBtn.textContent;
                downloadAllBtn.textContent = 'Zipping...';
                try {
                    const JSZip = await loadJSZip();
                    const zip = new JSZip();
                    const usedNames = new Set();
                    items.forEach(item => {
                        if (!item.outBlob) return;
                        let name = item.outName;
                        let counter = 1;
                        while (usedNames.has(name)) {
                            const dot = item.outName.lastIndexOf('.');
                            name = item.outName.slice(0, dot) + `_${counter++}` + item.outName.slice(dot);
                        }
                        usedNames.add(name);
                        zip.file(name, item.outBlob);
                    });
                    const zipBlob = await zip.generateAsync({ type: 'blob' });
                    triggerDownload(zipBlob, `abtit-converted-images-${Date.now()}.zip`);
                    showToast('ZIP archive downloaded!');
                } catch (err) {
                    showToast('ZIP export failed: ' + err.message);
                } finally {
                    downloadAllBtn.disabled = false;
                    downloadAllBtn.textContent = origText;
                }
            });
        }
    });
})();
