// src/utils/canvasUtils.js

export const getFilterString = (settings) => {
  return `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;
};

export const generateCanvas = (cropper, settings) => {
  if (!cropper) return null;

  // 1. Determine Output Format & Transparency
  // Always use transparent background for PNG/WEBP unless strictly JPEG
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

    // Calculate missing dimension
    if (!w && h) w = h * ratio;
    if (!h && w) h = w / ratio;

    // Unit Conversion
    if (settings.unit === "in") { w *= dpi; h *= dpi; }
    if (settings.unit === "cm") { w = (w * dpi) / 2.54; h = (h * dpi) / 2.54; }
    if (settings.unit === "mm") { w = (w * dpi) / 25.4; h = (h * dpi) / 25.4; }

    options.width = Math.round(w);
    options.height = Math.round(h);
  }

  // 3. Get Base Canvas from Cropper
  const rawCanvas = cropper.getCroppedCanvas(options);
  if (!rawCanvas) return null;

  // 4. Create Composition Canvas
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = rawCanvas.width;
  finalCanvas.height = rawCanvas.height;
  const ctx = finalCanvas.getContext("2d");

  // Handle Interpolation Style
  if (settings.interpolation === 'pixelated') {
     ctx.imageSmoothingEnabled = false;
     finalCanvas.style.imageRendering = 'pixelated';
  } else {
     ctx.imageSmoothingEnabled = true;
     ctx.imageSmoothingQuality = 'medium';
  }

  // 5. Apply Background Removal (Magic Eraser)
  if (settings.removeColorActive) {
     const tempCtx = rawCanvas.getContext('2d');
     const imgData = tempCtx.getImageData(0, 0, rawCanvas.width, rawCanvas.height);
     const data = imgData.data;
     
     const hex = settings.removeColorHex.replace('#', '');
     const rT = parseInt(hex.substring(0,2), 16);
     const gT = parseInt(hex.substring(2,4), 16);
     const bT = parseInt(hex.substring(4,6), 16);
     const threshold = (settings.removeTolerance / 100) * 442; 

     // Pass 1: Simple Color Distance
     for (let i = 0; i < data.length; i += 4) {
         const r = data[i], g = data[i+1], b = data[i+2];
         const dist = Math.sqrt((r - rT)**2 + (g - gT)**2 + (b - bT)**2);
         if (dist < threshold) data[i+3] = 0; 
     }

     // Pass 2: Erosion (Cleanup edges)
     if (settings.removeErosion > 0) {
        const protectionThreshold = threshold * 4.0;
        const width = rawCanvas.width;
        const height = rawCanvas.height;
        
        for (let e = 0; e < settings.removeErosion; e++) {
            const alphaCopy = new Uint8Array(data.length / 4);
            for (let j = 0; j < data.length; j += 4) alphaCopy[j/4] = data[j+3];

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x);
                    if (alphaCopy[idx] > 0) {
                        // Check neighbors
                        let isEdge = (x > 0 && alphaCopy[idx - 1] === 0) || 
                                     (x < width - 1 && alphaCopy[idx + 1] === 0) ||
                                     (y > 0 && alphaCopy[idx - width] === 0) ||
                                     (y < height - 1 && alphaCopy[idx + width] === 0);
                        
                        if (isEdge) {
                            const r = data[idx*4], g = data[idx*4+1], b = data[idx*4+2];
                            const dist = Math.sqrt((r - rT)**2 + (g - gT)**2 + (b - bT)**2);
                            if (dist < protectionThreshold) data[idx*4+3] = 0;
                        }
                    }
                }
            }
        }
     }
     tempCtx.putImageData(imgData, 0, 0);
  }

  // 6. Apply CSS Filters (Brightness/Contrast/etc)
  ctx.save();
  ctx.filter = getFilterString(settings);
  ctx.drawImage(rawCanvas, 0, 0);
  ctx.restore();

  // 7. Apply Round Crop Mask (Destination-In)
  if (settings.isRound) {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.ellipse(
        finalCanvas.width/2, finalCanvas.height/2, 
        finalCanvas.width/2, finalCanvas.height/2, 
        0, 0, 2 * Math.PI
    );
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; 
  }

  // 8. Apply Watermark
  if (settings.watermarkText) {
     ctx.save();
     ctx.globalAlpha = settings.watermarkOpacity;
     ctx.font = `bold ${settings.watermarkSize}px Arial, sans-serif`;
     ctx.fillStyle = settings.watermarkColor;
     ctx.textBaseline = 'top'; // Easier for manual coords
     
     const text = settings.watermarkText;
     const textMetrics = ctx.measureText(text);
     const textWidth = textMetrics.width;
     const textHeight = settings.watermarkSize; // Approximation

     let wx = 0, wy = 0;
     const pad = 20;
     const W = finalCanvas.width;
     const H = finalCanvas.height;

     // Calculate Position
     if (typeof settings.watermarkPos === 'string') {
         // PRESET POSITIONS
         ctx.textBaseline = 'middle';
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
         // MANUAL PERCENTAGE POSITION (x: 0-1, y: 0-1)
         // We store pos as percentage so it survives resizing
         wx = settings.watermarkPos.x * W;
         wy = settings.watermarkPos.y * H;
         
         // Center text on the point
         wx -= textWidth / 2;
         wy -= textHeight / 2;
         ctx.textBaseline = 'top';
     }

     ctx.fillText(text, wx, wy);
     ctx.restore();
  }
  
  return finalCanvas;
};