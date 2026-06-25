// src/utils/canvasUtils.js

const MAX_CANVAS_SIZE = 8192; // Prevent browser crashes

export const getFilterString = (settings) => {
    return `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;
};

export const generateCanvas = (cropper, settings, protectionCanvas = null, isPreview = false, isSubCellRender = false) => {
    if (!cropper) return null;

    if (settings.gridSplitActive && !isSubCellRender) {
        const cols = Math.max(1, settings.gridCols || 1);
        const rows = Math.max(1, settings.gridRows || 1);
        const totalCells = cols * rows;

        const isIndividual = settings.gridEditMode === 'individual';
        const hasAnyOverrides = isIndividual && Object.values(settings.gridPieceSettings || {}).some(p => p && Object.keys(p).length > 0);

        // Optimization 1: If no individual overrides exist at all, just render a single baseline canvas
        if (!hasAnyOverrides) {
            const baselineAdjustments = isIndividual ? (settings.globalSettingsBackup || {}) : {};
            const dummySettings = { ...settings, ...baselineAdjustments, gridSplitActive: false };
            return generateCanvas(cropper, dummySettings, protectionCanvas, isPreview, true);
        }

        const baselineAdjustments = isIndividual ? (settings.globalSettingsBackup || {}) : {};
        const dummySettings = { ...settings, ...baselineAdjustments, gridSplitActive: false };
        const dummyCanvas = generateCanvas(cropper, dummySettings, protectionCanvas, isPreview, true);
        if (!dummyCanvas) return null;

        const W = dummyCanvas.width;
        const H = dummyCanvas.height;
        const cellW = W / cols;
        const cellH = H / rows;

        const stitchCanvas = document.createElement("canvas");
        stitchCanvas.width = W;
        stitchCanvas.height = H;
        const stitchCtx = stitchCanvas.getContext("2d");

        for (let i = 0; i < totalCells; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;

            const piece = settings.gridPieceSettings?.[i];
            const hasOverrides = isIndividual && piece && Object.keys(piece).length > 0;

            // Optimization 2: Only render specific cells that have overrides. Copy directly from baseline for others.
            if (hasOverrides) {
                const cellCanvas = getGridPieceCanvas(cropper, settings, i, protectionCanvas, true, isPreview);
                if (cellCanvas) {
                    stitchCtx.drawImage(cellCanvas, col * cellW, row * cellH, cellW, cellH);
                }
            } else {
                stitchCtx.drawImage(
                    dummyCanvas,
                    col * cellW, row * cellH, cellW, cellH,
                    col * cellW, row * cellH, cellW, cellH
                );
            }
        }
        return stitchCanvas;
    }

    // 1. Setup Options
    const needsTransparency = settings.removeColorActive || settings.isRound || settings.format === "image/png" || settings.format === "image/webp";
    const fillColor = needsTransparency ? "transparent" : "#ffffff";

    const options = {
        fillColor: fillColor,
        imageSmoothingEnabled: settings.interpolation !== 'pixelated',
        imageSmoothingQuality: settings.interpolation === 'high' ? "high" : "medium",
    };

    // 2. Custom Size Logic (With Safety Validation)
    if (settings.customWidth || settings.customHeight) {
        let w = parseFloat(settings.customWidth);
        let h = parseFloat(settings.customHeight);

        // Safety check for NaN or Infinity
        if (isNaN(w) || w <= 0) w = 0;
        if (isNaN(h) || h <= 0) h = 0;

        const dpi = settings.dpi || 300;
        const data = cropper.getData();
        const ratio = data.width / data.height;

        if (!w && h) w = h * ratio;
        if (!h && w) h = w / ratio;

        if (settings.unit === "in") { w *= dpi; h *= dpi; }
        else if (settings.unit === "cm") { w = (w * dpi) / 2.54; h = (h * dpi) / 2.54; }
        else if (settings.unit === "mm") { w = (w * dpi) / 25.4; h = (h * dpi) / 25.4; }

        // Clamp dimensions to prevent crash
        options.width = Math.min(Math.round(w), MAX_CANVAS_SIZE);
        options.height = Math.min(Math.round(h), MAX_CANVAS_SIZE);
    }

    // 2b. Preview Size Capping (Crucial for high performance on big images)
    if (isPreview) {
        const maxPreviewSize = 1024;
        const data = cropper.getData();
        let w = options.width || data.width;
        let h = options.height || data.height;
        if (w > maxPreviewSize || h > maxPreviewSize) {
            const ratio = w / h;
            if (w > h) {
                options.width = maxPreviewSize;
                options.height = Math.round(maxPreviewSize / ratio);
            } else {
                options.height = maxPreviewSize;
                options.width = Math.round(maxPreviewSize * ratio);
            }
        }
    }

    // 3. Get Base Image
    const rawCanvas = cropper.getCroppedCanvas(options);
    if (!rawCanvas) return null;

    // 4. Create Working Canvas
    const workCanvas = document.createElement("canvas");
    workCanvas.width = rawCanvas.width;
    workCanvas.height = rawCanvas.height;
    // 'willReadFrequently' optimizes for read-heavy operations like Magic Eraser
    const ctx = workCanvas.getContext("2d", { willReadFrequently: true });

    if (settings.interpolation === 'pixelated') {
        ctx.imageSmoothingEnabled = false;
        workCanvas.style.imageRendering = 'pixelated';
    }

    ctx.drawImage(rawCanvas, 0, 0);

    // 5. MAGIC ERASER LOGIC (OPTIMIZED)
    if (settings.removeColorActive) {
        const width = workCanvas.width;
        const height = workCanvas.height;
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // 0 = Keep (Subject), 1 = Remove (Background)
        // Use one buffer for state, avoiding re-allocation in loops
        let mask = new Uint8Array(width * height);

        // 5a. Prepare Protection Mask
        let protectionData = null;
        if (protectionCanvas) {
            if (protectionCanvas.width === width && protectionCanvas.height === height) {
                // Skip temp canvas if dimensions match exactly
                const pCtx = protectionCanvas.getContext('2d', { willReadFrequently: true });
                protectionData = pCtx.getImageData(0, 0, width, height).data;
            } else {
                // Fall back to scale-rendering on temp canvas if dimensions differ
                const pTemp = document.createElement('canvas');
                pTemp.width = width;
                pTemp.height = height;
                const pCtx = pTemp.getContext('2d', { willReadFrequently: true });
                pCtx.drawImage(protectionCanvas, 0, 0, width, height);
                protectionData = pCtx.getImageData(0, 0, width, height).data;
            }
        }

        // 5b. Parse Target Color
        let hex = settings.removeColorHex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const rT = parseInt(hex.substring(0, 2), 16);
        const gT = parseInt(hex.substring(2, 4), 16);
        const bT = parseInt(hex.substring(4, 6), 16);

        const MAX_DIST_SQ = 195075;
        const tPct = settings.removeTolerance / 100;
        const thresholdSq = tPct * tPct * MAX_DIST_SQ;

        // 5c. PASS 1: Identification
        // Pre-compute matches and protection for all pixels in a single fast linear pass
        const colorMatch = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            const distSq = (r - rT) ** 2 + (g - gT) ** 2 + (b - bT) ** 2;
            if (distSq < thresholdSq) {
                colorMatch[i] = 1; // 1 (Matches/Remove)
            }
        }

        // Pre-allocate a single queue to reuse across all cells and operations
        let queue = new Uint32Array(Math.min(width * height, 1048576));

        if (settings.removeColorActive && settings.removeGridActive) {
            const rows = Math.max(1, parseInt(settings.removeGridRows) || 1);
            const cols = Math.max(1, parseInt(settings.removeGridCols) || 1);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x0 = Math.floor((c * width) / cols);
                    const x1 = Math.floor(((c + 1) * width) / cols);
                    const y0 = Math.floor((r * height) / rows);
                    const y1 = Math.floor(((r + 1) * height) / rows);

                    const cellW = x1 - x0;
                    const cellH = y1 - y0;
                    if (cellW <= 0 || cellH <= 0) continue;

                    let queueStart = 0;
                    let queueEnd = 0;

                    const pushQueue = (idx) => {
                        if (queueEnd >= queue.length) {
                            const newQueue = new Uint32Array(queue.length * 2);
                            newQueue.set(queue);
                            queue = newQueue;
                        }
                        queue[queueEnd++] = idx;
                    };

                    const seedDepth = Math.min(3, Math.min(cellW, cellH));

                    // Seed from local cell boundaries
                    for (let cx = x0; cx < x1; cx++) {
                        // Top edge of cell
                        for (let d = 0; d < seedDepth; d++) {
                            const idxTop = (y0 + d) * width + cx;
                            if (mask[idxTop] === 0 && colorMatch[idxTop] === 1) {
                                mask[idxTop] = 1;
                                pushQueue(idxTop);
                                break;
                            }
                        }
                        // Bottom edge of cell
                        for (let d = 0; d < seedDepth; d++) {
                            const idxBot = (y1 - 1 - d) * width + cx;
                            if (mask[idxBot] === 0 && colorMatch[idxBot] === 1) {
                                mask[idxBot] = 1;
                                pushQueue(idxBot);
                                break;
                            }
                        }
                    }

                    for (let cy = y0; cy < y1; cy++) {
                        // Left edge of cell
                        for (let d = 0; d < seedDepth; d++) {
                            const idxLeft = cy * width + (x0 + d);
                            if (mask[idxLeft] === 0 && colorMatch[idxLeft] === 1) {
                                mask[idxLeft] = 1;
                                pushQueue(idxLeft);
                                break;
                            }
                        }
                        // Right edge of cell
                        for (let d = 0; d < seedDepth; d++) {
                            const idxRight = cy * width + (x1 - 1 - d);
                            if (mask[idxRight] === 0 && colorMatch[idxRight] === 1) {
                                mask[idxRight] = 1;
                                pushQueue(idxRight);
                                break;
                            }
                        }
                    }
                    // Local BFS expansion
                    while (queueStart < queueEnd) {
                        const currentIdx = queue[queueStart++];
                        const cx = currentIdx % width;
                        const cy = Math.floor(currentIdx / width);

                        // Up
                        if (cy > y0) {
                            const upIdx = currentIdx - width;
                            if (mask[upIdx] === 0 && colorMatch[upIdx] === 1) {
                                mask[upIdx] = 1;
                                pushQueue(upIdx);
                            }
                        }
                        // Down
                        if (cy < y1 - 1) {
                            const downIdx = currentIdx + width;
                            if (mask[downIdx] === 0 && colorMatch[downIdx] === 1) {
                                mask[downIdx] = 1;
                                pushQueue(downIdx);
                            }
                        }
                        // Left
                        if (cx > x0) {
                            const leftIdx = currentIdx - 1;
                            if (mask[leftIdx] === 0 && colorMatch[leftIdx] === 1) {
                                mask[leftIdx] = 1;
                                pushQueue(leftIdx);
                            }
                        }
                        // Right
                        if (cx < x1 - 1) {
                            const rightIdx = currentIdx + 1;
                            if (mask[rightIdx] === 0 && colorMatch[rightIdx] === 1) {
                                mask[rightIdx] = 1;
                                pushQueue(rightIdx);
                            }
                        }
                    }
                }
            }
        } else if (settings.removeContiguousOnly) {
            let queueStart = 0;
            let queueEnd = 0;

            const pushQueue = (idx) => {
                if (queueEnd >= queue.length) {
                    const newQueue = new Uint32Array(queue.length * 2);
                    newQueue.set(queue);
                    queue = newQueue;
                }
                queue[queueEnd++] = idx;
            };

            const seedDepth = Math.min(3, Math.min(width, height));

            // Top & Bottom rows
            for (let x = 0; x < width; x++) {
                for (let d = 0; d < seedDepth; d++) {
                    const idxTop = d * width + x;
                    if (colorMatch[idxTop] === 1 && mask[idxTop] === 0) {
                        mask[idxTop] = 1;
                        pushQueue(idxTop);
                        break;
                    }
                }
                for (let d = 0; d < seedDepth; d++) {
                    const idxBot = (height - 1 - d) * width + x;
                    if (height > d && colorMatch[idxBot] === 1 && mask[idxBot] === 0) {
                        mask[idxBot] = 1;
                        pushQueue(idxBot);
                        break;
                    }
                }
            }

            // Left & Right columns
            for (let y = 0; y < height; y++) {
                for (let d = 0; d < seedDepth; d++) {
                    const idxLeft = y * width + d;
                    if (width > d && colorMatch[idxLeft] === 1 && mask[idxLeft] === 0) {
                        mask[idxLeft] = 1;
                        pushQueue(idxLeft);
                        break;
                    }
                }
                for (let d = 0; d < seedDepth; d++) {
                    const idxRight = y * width + (width - 1 - d);
                    if (width > d && colorMatch[idxRight] === 1 && mask[idxRight] === 0) {
                        mask[idxRight] = 1;
                        pushQueue(idxRight);
                        break;
                    }
                }
            }

            // BFS expansion
            while (queueStart < queueEnd) {
                const currentIdx = queue[queueStart++];
                const cx = currentIdx % width;
                const cy = Math.floor(currentIdx / width);

                // Up
                if (cy > 0) {
                    const upIdx = currentIdx - width;
                    if (mask[upIdx] === 0 && colorMatch[upIdx] === 1) {
                        mask[upIdx] = 1;
                        pushQueue(upIdx);
                    }
                }
                // Down
                if (cy < height - 1) {
                    const downIdx = currentIdx + width;
                    if (mask[downIdx] === 0 && colorMatch[downIdx] === 1) {
                        mask[downIdx] = 1;
                        pushQueue(downIdx);
                    }
                }
                // Left
                if (cx > 0) {
                    const leftIdx = currentIdx - 1;
                    if (mask[leftIdx] === 0 && colorMatch[leftIdx] === 1) {
                        mask[leftIdx] = 1;
                        pushQueue(leftIdx);
                    }
                }
                // Right
                if (cx < width - 1) {
                    const rightIdx = currentIdx + 1;
                    if (mask[rightIdx] === 0 && colorMatch[rightIdx] === 1) {
                        mask[rightIdx] = 1;
                        pushQueue(rightIdx);
                    }
                }
            }
        } else {
            // Global mode: copy pre-computed color matches directly to mask
            mask.set(colorMatch);
        }

        // 5ca. Apply Protection Mask (Force Keep/Remove) before Erosion
        if (protectionData) {
            for (let j = 0; j < mask.length; j++) {
                const i = j * 4;
                if (protectionData[i + 3] > 0) {
                    const rVal = protectionData[i];
                    const gVal = protectionData[i + 1];
                    if (gVal > rVal) {
                        mask[j] = 0; // Force Keep
                    } else if (rVal > gVal) {
                        // Only remove if it matches target color!
                        const r = data[i], g = data[i + 1], b = data[i + 2];
                        const distSq = (r - rT) ** 2 + (g - gT) ** 2 + (b - bT) ** 2;
                        if (distSq < thresholdSq) {
                            mask[j] = 1; // Force Remove
                        } else {
                            mask[j] = 0; // Otherwise Keep
                        }
                    }
                }
            }
        }

        // 5d. PASS 2: EXPAND EDGES (Optimized - No internal allocation)
        if (settings.removeErosion > 0) {
            const loops = Math.min(settings.removeErosion, 10);
            // Pre-allocate the swap buffer ONCE
            let nextMask = new Uint8Array(width * height);

            const isRemoveBrush = (idx) => {
                if (!protectionData) return false;
                const pIdx = idx * 4;
                return protectionData[pIdx + 3] > 0 && protectionData[pIdx] > protectionData[pIdx + 1];
            };

            for (let k = 0; k < loops; k++) {
                // Copy current state to nextMask initially
                nextMask.set(mask);

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = y * width + x;

                        // Only process if currently Subject(0) to see if we should eat it
                        if (mask[idx] === 0) {
                            if (protectionData && protectionData[idx * 4 + 3] > 0) continue;

                            const isEdge = (x > 0 && mask[idx - 1] === 1 && !isRemoveBrush(idx - 1)) ||
                                (x < width - 1 && mask[idx + 1] === 1 && !isRemoveBrush(idx + 1)) ||
                                (y > 0 && mask[idx - width] === 1 && !isRemoveBrush(idx - width)) ||
                                (y < height - 1 && mask[idx + width] === 1 && !isRemoveBrush(idx + width));

                            if (isEdge) {
                                nextMask[idx] = 1;
                            }
                        }
                    }
                }
                // Update mask for next iteration
                mask.set(nextMask);
            }
        }

        // 5e. PASS 3: Apply Mask
        for (let j = 0; j < mask.length; j++) {
            const i = j * 4;
            if (protectionData && protectionData[i + 3] > 0) {
                const rVal = protectionData[i];
                const gVal = protectionData[i + 1];
                if (gVal > rVal) {
                    mask[j] = 0; // Force Keep
                } else if (rVal > gVal) {
                    // Only remove if it matches target color!
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    const distSq = (r - rT) ** 2 + (g - gT) ** 2 + (b - bT) ** 2;
                    if (distSq < thresholdSq) {
                        mask[j] = 1; // Force Remove
                    } else {
                        mask[j] = 0; // Otherwise Keep
                    }
                }
            }

            if (mask[j] === 1) {
                if (settings.showMaskPreview) {
                    data[i] = (data[i] + 255) / 2;
                    data[i + 1] = data[i + 1] / 2;
                    data[i + 2] = data[i + 2] / 2;
                } else {
                    data[i + 3] = 0;
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }

    // 6. Apply CSS Filters
    const filterCanvas = document.createElement("canvas");
    filterCanvas.width = workCanvas.width;
    filterCanvas.height = workCanvas.height;
    const fCtx = filterCanvas.getContext("2d", { willReadFrequently: true });

    fCtx.filter = getFilterString(settings);
    fCtx.drawImage(workCanvas, 0, 0);

    // 7. Round Crop
    if (settings.isRound) {
        fCtx.globalCompositeOperation = 'destination-in';
        fCtx.beginPath();
        fCtx.ellipse(
            filterCanvas.width / 2, filterCanvas.height / 2,
            filterCanvas.width / 2, filterCanvas.height / 2,
            0, 0, 2 * Math.PI
        );
        fCtx.fill();
        fCtx.globalCompositeOperation = 'source-over';
    }

    // 8. Watermark
    if (settings.watermarkText) {
        fCtx.save();
        fCtx.globalAlpha = settings.watermarkOpacity;
        fCtx.font = `bold ${settings.watermarkSize}px Arial, sans-serif`;
        fCtx.fillStyle = settings.watermarkColor;

        const text = settings.watermarkText;
        const textMetrics = fCtx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = settings.watermarkSize;
        const W = filterCanvas.width, H = filterCanvas.height;
        let wx = (W - textWidth) / 2, wy = H / 2;

        if (typeof settings.watermarkPos === 'string') {
            fCtx.textBaseline = 'middle';
            if (settings.watermarkPos === 'Top-Left') { wx = 20; wy = 20 + textHeight / 2; }
            else if (settings.watermarkPos === 'Top') { wy = 20 + textHeight / 2; }
            else if (settings.watermarkPos === 'Top-Right') { wx = W - textWidth - 20; wy = 20 + textHeight / 2; }
            else if (settings.watermarkPos === 'Left') { wx = 20; }
            else if (settings.watermarkPos === 'Right') { wx = W - textWidth - 20; }
            else if (settings.watermarkPos === 'Bottom-Left') { wx = 20; wy = H - 20 - textHeight / 2; }
            else if (settings.watermarkPos === 'Bottom') { wy = H - 20 - textHeight / 2; }
            else if (settings.watermarkPos === 'Bottom-Right') { wx = W - textWidth - 20; wy = H - 20 - textHeight / 2; }
        } else if (typeof settings.watermarkPos === 'object') {
            fCtx.textBaseline = 'top';
            wx = settings.watermarkPos.x * W - textWidth / 2;
            wy = settings.watermarkPos.y * H - textHeight / 2;
        }
        fCtx.fillText(text, wx, wy);
        fCtx.restore();
    }

    return filterCanvas;
};

export const getGridPieceCanvas = (cropper, settings, index, protectionCanvas = null, isSubCellRender = false, isPreview = false) => {
    if (!cropper) return null;

    const cols = Math.max(1, settings.gridCols || 1);
    const rows = Math.max(1, settings.gridRows || 1);
    const row = Math.floor(index / cols);
    const col = index % cols;

    const isIndividual = settings.gridEditMode === 'individual';
    const pieceOverrides = isIndividual ? (settings.gridPieceSettings[index] || {}) : {};
    const cellSettings = isIndividual
        ? { ...settings, ...settings.globalSettingsBackup, ...pieceOverrides }
        : { ...settings };

    // Strip rotation and flips from cellSettings when rendering fullCanvas, 
    // since they are applied per-cell inside cellCanvas!
    const dummyCellSettings = { ...cellSettings, rotation: 0, scaleX: 1, scaleY: 1 };
    const fullCanvas = generateCanvas(cropper, { ...dummyCellSettings, showMaskPreview: false }, protectionCanvas, isPreview, true);
    if (!fullCanvas) return null;

    const cellW = fullCanvas.width / cols;
    const cellH = fullCanvas.height / rows;

    const cellRotation = cellSettings.rotation || 0;
    const isRotated90or270 = (cellRotation % 180) !== 0;
    const targetW = isRotated90or270 ? cellH : cellW;
    const targetH = isRotated90or270 ? cellW : cellH;

    const cellCanvas = document.createElement('canvas');
    cellCanvas.width = targetW;
    cellCanvas.height = targetH;
    const cellCtx = cellCanvas.getContext('2d');

    // Translate to center for rotation/flip transformations
    cellCtx.translate(targetW / 2, targetH / 2);

    if (cellRotation) {
        cellCtx.rotate((cellRotation * Math.PI) / 180);
    }

    const flipX = cellSettings.scaleX || 1;
    const flipY = cellSettings.scaleY || 1;
    if (flipX !== 1 || flipY !== 1) {
        cellCtx.scale(flipX, flipY);
    }

    cellCtx.drawImage(
        fullCanvas,
        col * cellW, row * cellH, cellW, cellH,
        -cellW / 2, -cellH / 2, cellW, cellH
    );

    return cellCanvas;
};