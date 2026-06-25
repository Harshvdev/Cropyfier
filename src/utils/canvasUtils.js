// src/utils/canvasUtils.js

const MAX_CANVAS_SIZE = 8192; // Prevent browser crashes

export const getFilterString = (settings) => {
  return `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;
};

export const generateCanvas = (cropper, settings, protectionCanvas = null) => {
  if (!cropper) return null;

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
        const pTemp = document.createElement('canvas');
        pTemp.width = width;
        pTemp.height = height;
        const pCtx = pTemp.getContext('2d', { willReadFrequently: true });
        pCtx.drawImage(protectionCanvas, 0, 0, width, height);
        protectionData = pCtx.getImageData(0, 0, width, height).data;
     }

     // 5b. Parse Target Color
     let hex = settings.removeColorHex.replace('#', '');
     if(hex.length === 3) hex = hex.split('').map(c => c+c).join('');
     const rT = parseInt(hex.substring(0,2), 16);
     const gT = parseInt(hex.substring(2,4), 16);
     const bT = parseInt(hex.substring(4,6), 16);
     
     const MAX_DIST_SQ = 195075;
     const tPct = settings.removeTolerance / 100;
     const thresholdSq = tPct * tPct * MAX_DIST_SQ;

      // 5c. PASS 1: Identification
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

                  let queue = new Uint32Array(Math.min(cellW * cellH, 65536));
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

                  const matchesAndNotProtected = (idx) => {
                      if (protectionData && protectionData[idx * 4 + 3] > 0) {
                          return false;
                      }
                      const px = idx % width;
                      const py = Math.floor(idx / width);
                      if (px < x0 || px >= x1 || py < y0 || py >= y1) {
                          return false;
                      }
                      const rVal = data[idx * 4];
                      const gVal = data[idx * 4 + 1];
                      const bVal = data[idx * 4 + 2];
                      const distSq = (rVal - rT)**2 + (gVal - gT)**2 + (bVal - bT)**2;
                      return distSq < thresholdSq;
                  };

                  const seedDepth = Math.min(3, Math.min(cellW, cellH));

                  // Seed from local cell boundaries
                  for (let cx = x0; cx < x1; cx++) {
                      for (let d = 0; d < seedDepth; d++) {
                          const idxTop = (y0 + d) * width + cx;
                          if (mask[idxTop] === 0 && matchesAndNotProtected(idxTop)) {
                              mask[idxTop] = 1;
                              pushQueue(idxTop);
                              break;
                          }
                      }
                      for (let d = 0; d < seedDepth; d++) {
                          const idxBot = (y1 - 1 - d) * width + cx;
                          if (mask[idxBot] === 0 && matchesAndNotProtected(idxBot)) {
                              mask[idxBot] = 1;
                              pushQueue(idxBot);
                              break;
                          }
                      }
                  }

                  for (let cy = y0; cy < y1; cy++) {
                      for (let d = 0; d < seedDepth; d++) {
                          const idxLeft = cy * width + (x0 + d);
                          if (mask[idxLeft] === 0 && matchesAndNotProtected(idxLeft)) {
                              mask[idxLeft] = 1;
                              pushQueue(idxLeft);
                              break;
                          }
                      }
                      for (let d = 0; d < seedDepth; d++) {
                          const idxRight = cy * width + (x1 - 1 - d);
                          if (mask[idxRight] === 0 && matchesAndNotProtected(idxRight)) {
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
                          if (mask[upIdx] === 0 && matchesAndNotProtected(upIdx)) {
                              mask[upIdx] = 1;
                              pushQueue(upIdx);
                          }
                      }
                      // Down
                      if (cy < y1 - 1) {
                          const downIdx = currentIdx + width;
                          if (mask[downIdx] === 0 && matchesAndNotProtected(downIdx)) {
                              mask[downIdx] = 1;
                              pushQueue(downIdx);
                          }
                      }
                      // Left
                      if (cx > x0) {
                          const leftIdx = currentIdx - 1;
                          if (mask[leftIdx] === 0 && matchesAndNotProtected(leftIdx)) {
                              mask[leftIdx] = 1;
                              pushQueue(leftIdx);
                          }
                      }
                      // Right
                      if (cx < x1 - 1) {
                          const rightIdx = currentIdx + 1;
                          if (mask[rightIdx] === 0 && matchesAndNotProtected(rightIdx)) {
                              mask[rightIdx] = 1;
                              pushQueue(rightIdx);
                          }
                      }
                  }
              }
          }
      } else if (settings.removeContiguousOnly) {
          // Queue-based BFS starting from all 4 boundaries
          let queue = new Uint32Array(262144);
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

          const matchesAndNotProtected = (idx) => {
              if (protectionData && protectionData[idx * 4 + 3] > 0) {
                  return false;
              }
              const r = data[idx * 4];
              const g = data[idx * 4 + 1];
              const b = data[idx * 4 + 2];
              const distSq = (r - rT)**2 + (g - gT)**2 + (b - bT)**2;
              return distSq < thresholdSq;
          };

          const seedDepth = Math.min(3, Math.min(width, height));

          // Top & Bottom rows (check top-down/bottom-up up to seedDepth)
          for (let x = 0; x < width; x++) {
              for (let d = 0; d < seedDepth; d++) {
                  const idxTop = d * width + x;
                  if (matchesAndNotProtected(idxTop) && mask[idxTop] === 0) {
                      mask[idxTop] = 1;
                      pushQueue(idxTop);
                      break;
                  }
              }
              for (let d = 0; d < seedDepth; d++) {
                  const idxBot = (height - 1 - d) * width + x;
                  if (height > d && matchesAndNotProtected(idxBot) && mask[idxBot] === 0) {
                      mask[idxBot] = 1;
                      pushQueue(idxBot);
                      break;
                  }
              }
          }

          // Left & Right columns (check left-to-right/right-to-left up to seedDepth)
          for (let y = 0; y < height; y++) {
              for (let d = 0; d < seedDepth; d++) {
                  const idxLeft = y * width + d;
                  if (width > d && matchesAndNotProtected(idxLeft) && mask[idxLeft] === 0) {
                      mask[idxLeft] = 1;
                      pushQueue(idxLeft);
                      break;
                  }
              }
              for (let d = 0; d < seedDepth; d++) {
                  const idxRight = y * width + (width - 1 - d);
                  if (width > d && matchesAndNotProtected(idxRight) && mask[idxRight] === 0) {
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

              // 4-connectivity: check neighbors
              // Up
              if (cy > 0) {
                  const upIdx = currentIdx - width;
                  if (mask[upIdx] === 0 && matchesAndNotProtected(upIdx)) {
                      mask[upIdx] = 1;
                      pushQueue(upIdx);
                  }
              }
              // Down
              if (cy < height - 1) {
                  const downIdx = currentIdx + width;
                  if (mask[downIdx] === 0 && matchesAndNotProtected(downIdx)) {
                      mask[downIdx] = 1;
                      pushQueue(downIdx);
                  }
              }
              // Left
              if (cx > 0) {
                  const leftIdx = currentIdx - 1;
                  if (mask[leftIdx] === 0 && matchesAndNotProtected(leftIdx)) {
                      mask[leftIdx] = 1;
                      pushQueue(leftIdx);
                  }
              }
              // Right
              if (cx < width - 1) {
                  const rightIdx = currentIdx + 1;
                  if (mask[rightIdx] === 0 && matchesAndNotProtected(rightIdx)) {
                      mask[rightIdx] = 1;
                      pushQueue(rightIdx);
                  }
              }
          }
      } else {
          // Global color removal
          for (let i = 0; i < width * height; i++) {
              const idx = i * 4;

              // Check Protection - Explicitly mark as 0 (Keep)
              if (protectionData && protectionData[idx+3] > 0) {
                  mask[i] = 0; 
                  continue;
              }

              const r = data[idx], g = data[idx+1], b = data[idx+2];
              const distSq = (r - rT)**2 + (g - gT)**2 + (b - bT)**2;

              if (distSq < thresholdSq) {
                  mask[i] = 1; // Mark for removal
              }
          }
      }

     // 5d. PASS 2: EXPAND EDGES (Optimized - No internal allocation)
     if (settings.removeErosion > 0) {
         const loops = Math.min(settings.removeErosion, 10);
         // Pre-allocate the swap buffer ONCE
         let nextMask = new Uint8Array(width * height);
         
         for(let k=0; k<loops; k++) {
             // Copy current state to nextMask initially
             nextMask.set(mask);

             for (let y = 0; y < height; y++) {
                 for (let x = 0; x < width; x++) {
                     const idx = y * width + x;
                     
                     // Only process if currently Subject(0) to see if we should eat it
                     if (mask[idx] === 0) {
                         if (protectionData && protectionData[idx*4+3] > 0) continue;

                         const isEdge = (x > 0 && mask[idx-1] === 1) ||
                                        (x < width-1 && mask[idx+1] === 1) ||
                                        (y > 0 && mask[idx-width] === 1) ||
                                        (y < height-1 && mask[idx+width] === 1);
                         
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
         if (mask[j] === 1) {
             const i = j * 4;
             if (settings.showMaskPreview) {
                 data[i] = (data[i] + 255) / 2;
                 data[i+1] = data[i+1] / 2;
                 data[i+2] = data[i+2] / 2;
             } else {
                 data[i+3] = 0;
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
        filterCanvas.width/2, filterCanvas.height/2, 
        filterCanvas.width/2, filterCanvas.height/2, 
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
     let wx = (W - textWidth)/2, wy = H/2; 

     if (typeof settings.watermarkPos === 'string') {
         fCtx.textBaseline = 'middle';
         if(settings.watermarkPos === 'Top-Left') { wx=20; wy=20+textHeight/2; }
         else if(settings.watermarkPos === 'Top') { wy=20+textHeight/2; }
         else if(settings.watermarkPos === 'Top-Right') { wx=W-textWidth-20; wy=20+textHeight/2; }
         else if(settings.watermarkPos === 'Left') { wx=20; }
         else if(settings.watermarkPos === 'Right') { wx=W-textWidth-20; }
         else if(settings.watermarkPos === 'Bottom-Left') { wx=20; wy=H-20-textHeight/2; }
         else if(settings.watermarkPos === 'Bottom') { wy=H-20-textHeight/2; }
         else if(settings.watermarkPos === 'Bottom-Right') { wx=W-textWidth-20; wy=H-20-textHeight/2; }
     } else if (typeof settings.watermarkPos === 'object') {
         fCtx.textBaseline = 'top';
         wx = settings.watermarkPos.x * W - textWidth/2;
         wy = settings.watermarkPos.y * H - textHeight/2;
     }
     fCtx.fillText(text, wx, wy);
     fCtx.restore();
  }
  
  return filterCanvas;
};