// src/utils/canvasUtils.js

export const getFilterString = (settings) => {
  return `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;
};

export const generateCanvas = (cropper, settings) => {
  if (!cropper) return null;

  // 1. Determine Output Format & Transparency
  const isTransparent = settings.format !== "image/jpeg";
  const fillColor = isTransparent ? "transparent" : "#ffffff";

  const options = {
    fillColor: fillColor,
    imageSmoothingEnabled: settings.interpolation === 'high',
    imageSmoothingQuality: settings.interpolation === 'high' ? "high" : "low",
  };

  // 2. Handle Custom Dimensions (Resizing)
  if (settings.customWidth || settings.customHeight) {
    let w = parseFloat(settings.customWidth);
    let h = parseFloat(settings.customHeight);
    const dpi = settings.dpi || 300;
    const data = cropper.getData();
    const ratio = data.width / data.height;

    if (!w && h) w = h * ratio;
    if (!h && w) h = w / ratio;

    if (settings.unit === "in") { w *= dpi; h *= dpi; }
    if (settings.unit === "cm") { w = (w * dpi) / 2.54; h = (h * dpi) / 2.54; }
    if (settings.unit === "mm") { w = (w * dpi) / 25.4; h = (h * dpi) / 25.4; }

    options.width = Math.round(w);
    options.height = Math.round(h);
  }

  // 3. Get Base Canvas (Immutable Source)
  const rawCanvas = cropper.getCroppedCanvas(options);
  if (!rawCanvas) return null;

  // 4. Create Working Canvas (To avoid mutating rawCanvas)
  const workCanvas = document.createElement("canvas");
  workCanvas.width = rawCanvas.width;
  workCanvas.height = rawCanvas.height;
  const ctx = workCanvas.getContext("2d");

  // Handle Interpolation
  if (settings.interpolation === 'pixelated') {
     ctx.imageSmoothingEnabled = false;
     workCanvas.style.imageRendering = 'pixelated';
  } else {
     ctx.imageSmoothingEnabled = true;
     ctx.imageSmoothingQuality = 'medium';
  }

  // 5. Draw raw image to work canvas
  ctx.drawImage(rawCanvas, 0, 0);

  // 6. Apply Background Removal (Magic Eraser)
  if (settings.removeColorActive) {
     const imgData = ctx.getImageData(0, 0, workCanvas.width, workCanvas.height);
     const data = imgData.data;
     
     const hex = settings.removeColorHex.replace('#', '');
     const rT = parseInt(hex.substring(0,2), 16);
     const gT = parseInt(hex.substring(2,4), 16);
     const bT = parseInt(hex.substring(4,6), 16);
     
     // Optimization: Pre-calculate max squared distance (255^2 * 3)
     const MAX_DIST_SQ = 195075;
     // Convert tolerance (0-100) to squared threshold
     const tPct = settings.removeTolerance / 100;
     const thresholdSq = tPct * tPct * MAX_DIST_SQ;

     // Pass 1: Simple Color Distance
     for (let i = 0; i < data.length; i += 4) {
         const r = data[i], g = data[i+1], b = data[i+2];
         const distSq = (r - rT)**2 + (g - gT)**2 + (b - bT)**2;
         if (distSq < thresholdSq) data[i+3] = 0; 
     }

     // Pass 2: Erosion (Cleanup edges)
     if (settings.removeErosion > 0) {
        const loops = Math.min(settings.removeErosion, 5); // Cap at 5px
        const protectionThresholdSq = thresholdSq * 16; // 4x distance allowed at edges
        const width = workCanvas.width;
        const height = workCanvas.height;
        
        for (let e = 0; e < loops; e++) {
            const alphaCopy = new Uint8Array(data.length / 4);
            for (let j = 0; j < data.length; j += 4) alphaCopy[j/4] = data[j+3];

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x);
                    if (alphaCopy[idx] > 0) { // If pixel is visible
                        // Check if it's an edge pixel (neighbor is transparent)
                        let isEdge = (x > 0 && alphaCopy[idx - 1] === 0) || 
                                     (x < width - 1 && alphaCopy[idx + 1] === 0) ||
                                     (y > 0 && alphaCopy[idx - width] === 0) ||
                                     (y < height - 1 && alphaCopy[idx + width] === 0);
                        
                        if (isEdge) {
                            const r = data[idx*4], g = data[idx*4+1], b = data[idx*4+2];
                            const distSq = (r - rT)**2 + (g - gT)**2 + (b - bT)**2;
                            // If it's an edge AND somewhat close to target color, delete it
                            if (distSq < protectionThresholdSq) {
                                data[idx*4+3] = 0;
                            }
                        }
                    }
                }
            }
        }
     }
     ctx.putImageData(imgData, 0, 0);
  }

  // 7. Apply CSS Filters and Create Final Canvas
  const filterCanvas = document.createElement("canvas");
  filterCanvas.width = workCanvas.width;
  filterCanvas.height = workCanvas.height;
  const fCtx = filterCanvas.getContext("2d");
  
  fCtx.filter = getFilterString(settings);
  fCtx.drawImage(workCanvas, 0, 0);

  // 8. Apply Round Crop Mask
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

  // 9. Apply Watermark
  if (settings.watermarkText) {
     fCtx.save();
     fCtx.globalAlpha = settings.watermarkOpacity;
     fCtx.font = `bold ${settings.watermarkSize}px Arial, sans-serif`;
     fCtx.fillStyle = settings.watermarkColor;
     fCtx.textBaseline = 'top';
     
     const text = settings.watermarkText;
     const textMetrics = fCtx.measureText(text);
     const textWidth = textMetrics.width;
     const textHeight = settings.watermarkSize;

     let wx = 0, wy = 0;
     const pad = 20;
     const W = filterCanvas.width;
     const H = filterCanvas.height;

     if (typeof settings.watermarkPos === 'string') {
         fCtx.textBaseline = 'middle';
         switch(settings.watermarkPos) {
            case 'Top-Left': wx = pad; wy = pad + textHeight/2; break;
            case 'Top': wx = (W - textWidth)/2; wy = pad + textHeight/2; break;
            case 'Top-Right': wx = W - textWidth - pad; wy = pad + textHeight/2; break;
            case 'Left': wx = pad; wy = H/2; break;
            case 'Center': wx = (W - textWidth)/2; wy = H/2; break;
            case 'Right': wx = W - textWidth - pad; wy = H/2; break;
            case 'Bottom-Left': wx = pad; wy = H - pad - textHeight/2; break;
            case 'Bottom': wx = (W - textWidth)/2; wy = H - pad - textHeight/2; break;
            case 'Bottom-Right': wx = W - textWidth - pad; wy = H - pad - textHeight/2; break;
            default: wx = (W - textWidth)/2; wy = H/2;
         }
     } else if (typeof settings.watermarkPos === 'object') {
         wx = settings.watermarkPos.x * W;
         wy = settings.watermarkPos.y * H;
         wx -= textWidth / 2;
         wy -= textHeight / 2;
         fCtx.textBaseline = 'top';
     }

     fCtx.fillText(text, wx, wy);
     fCtx.restore();
  }
  
  return filterCanvas;
};