// src/utils/canvasUtils.js

export const getFilterString = (settings) => {
  return `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;
};

export const generateCanvas = (cropper, settings) => {
  if (!cropper) return null;

  // 1. Determine Output Format & Transparency
  // If we are removing color or using round crop, we force transparency handling
  const needsTransparency = settings.removeColorActive || settings.isRound || settings.format === "image/png" || settings.format === "image/webp";
  const fillColor = needsTransparency ? "transparent" : "#ffffff";

  const options = {
    fillColor: fillColor,
    imageSmoothingEnabled: settings.interpolation !== 'pixelated',
    imageSmoothingQuality: settings.interpolation === 'high' ? "high" : "medium",
  };

  // 2. Handle Custom Dimensions (Resizing)
  if (settings.customWidth || settings.customHeight) {
    let w = parseFloat(settings.customWidth);
    let h = parseFloat(settings.customHeight);
    const dpi = settings.dpi || 300;
    
    // Get natural data to determine aspect ratio
    const data = cropper.getData(); 
    const ratio = data.width / data.height;

    if (!w && h) w = h * ratio;
    if (!h && w) h = w / ratio;

    // Unit Conversion
    if (settings.unit === "in") { w *= dpi; h *= dpi; }
    else if (settings.unit === "cm") { w = (w * dpi) / 2.54; h = (h * dpi) / 2.54; }
    else if (settings.unit === "mm") { w = (w * dpi) / 25.4; h = (h * dpi) / 25.4; }

    options.width = Math.round(w);
    options.height = Math.round(h);
  }

  // 3. Get Base Canvas
  const rawCanvas = cropper.getCroppedCanvas(options);
  if (!rawCanvas) return null;

  // 4. Create Working Canvas
  const workCanvas = document.createElement("canvas");
  workCanvas.width = rawCanvas.width;
  workCanvas.height = rawCanvas.height;
  const ctx = workCanvas.getContext("2d", { willReadFrequently: true });

  if (settings.interpolation === 'pixelated') {
     ctx.imageSmoothingEnabled = false;
     workCanvas.style.imageRendering = 'pixelated';
  }

  // 5. Draw raw image
  ctx.drawImage(rawCanvas, 0, 0);

  // 6. Apply Background Removal (Magic Eraser)
  if (settings.removeColorActive) {
     const imgData = ctx.getImageData(0, 0, workCanvas.width, workCanvas.height);
     const data = imgData.data;
     
     // Parse Hex
     let hex = settings.removeColorHex.replace('#', '');
     if(hex.length === 3) hex = hex.split('').map(c => c+c).join('');
     
     const rT = parseInt(hex.substring(0,2), 16);
     const gT = parseInt(hex.substring(2,4), 16);
     const bT = parseInt(hex.substring(4,6), 16);
     
     const MAX_DIST_SQ = 195075; // 255^2 * 3
     const tPct = settings.removeTolerance / 100;
     const thresholdSq = tPct * tPct * MAX_DIST_SQ;

     // Pass 1: Remove Color
     for (let i = 0; i < data.length; i += 4) {
         const r = data[i], g = data[i+1], b = data[i+2];
         // Simple Euclidean distance squared
         const distSq = (r - rT)**2 + (g - gT)**2 + (b - bT)**2;
         if (distSq < thresholdSq) {
             data[i+3] = 0; // Set Alpha to 0
         }
     }

     // Pass 2: Erosion (Edge Cleanup)
     if (settings.removeErosion > 0) {
        const width = workCanvas.width;
        const height = workCanvas.height;
        const protectionThresholdSq = thresholdSq * 4; // Stricter logic for edges

        // We clone alpha channel to check neighbors without dirty reads
        const alphaCopy = new Uint8Array(data.length / 4);
        for (let j = 0; j < data.length; j += 4) alphaCopy[j/4] = data[j+3];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                // If pixel is visible
                if (alphaCopy[idx] > 0) {
                    // Check 4 neighbors
                    const isEdge = (x > 0 && alphaCopy[idx - 1] === 0) || 
                                   (x < width - 1 && alphaCopy[idx + 1] === 0) ||
                                   (y > 0 && alphaCopy[idx - width] === 0) ||
                                   (y < height - 1 && alphaCopy[idx + width] === 0);
                    
                    if (isEdge) {
                        // Check color distance again - if it's kinda close to target, kill it
                        const r = data[idx*4], g = data[idx*4+1], b = data[idx*4+2];
                        const distSq = (r - rT)**2 + (g - gT)**2 + (b - bT)**2;
                        
                        // If it's on the edge and vaguely resembles the background, erode it
                        // Logic: reduce alpha based on erosion strength
                        if (distSq < protectionThresholdSq) {
                           data[idx*4+3] = 0; 
                        }
                    }
                }
            }
        }
     }
     ctx.putImageData(imgData, 0, 0);
  }

  // 7. Apply CSS Filters
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
         fCtx.textBaseline = 'top';
         wx = settings.watermarkPos.x * W;
         wy = settings.watermarkPos.y * H;
         // Center the text on the point
         wx -= textWidth / 2;
         wy -= textHeight / 2;
     }

     fCtx.fillText(text, wx, wy);
     fCtx.restore();
  }
  
  return filterCanvas;
};