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