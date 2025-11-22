export const getFilterString = (settings) => {
  return `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;
};

export const generateCroppedImage = (cropper, settings) => {
  if (!cropper) return;

  const options = {
    fillColor: settings.format === "image/jpeg" ? "#fff" : "transparent",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  };

  // 1. Handle Custom Size & Unit Conversion
  if (settings.customWidth || settings.customHeight) {
    let w = parseFloat(settings.customWidth);
    let h = parseFloat(settings.customHeight);
    const dpi = settings.dpi || 300;
    
    const currentData = cropper.getData();
    const currentRatio = currentData.width / currentData.height;

    // Auto-calculate missing dimension
    if (!w && h) w = h * currentRatio;
    if (!h && w) h = w / currentRatio;

    // Convert units to pixels
    if (settings.unit === "in") { w *= dpi; h *= dpi; }
    else if (settings.unit === "cm") { w = (w * dpi) / 2.54; h = (h * dpi) / 2.54; }
    else if (settings.unit === "mm") { w = (w * dpi) / 25.4; h = (h * dpi) / 25.4; }

    options.width = Math.round(w);
    options.height = Math.round(h);
  }

  // 2. Get Raw Canvas (Resized by cropper if options provided)
  const rawCanvas = cropper.getCroppedCanvas(options);
  if (!rawCanvas) return;

  // 3. Create Final Canvas
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = rawCanvas.width;
  finalCanvas.height = rawCanvas.height;
  const ctx = finalCanvas.getContext("2d");

  ctx.save();

  // 4. Handle Round/Oval Clip *BEFORE* drawing
  if (settings.isRound) {
    ctx.beginPath();
    ctx.ellipse(
      finalCanvas.width / 2, 
      finalCanvas.height / 2, 
      finalCanvas.width / 2, 
      finalCanvas.height / 2, 
      0, 0, 2 * Math.PI
    );
    ctx.closePath();
    ctx.clip();
  }

  // 5. Apply Filters and Draw
  ctx.filter = getFilterString(settings);
  
  // Draw the raw cropped image onto the final canvas
  // The clip (if active) will cut it, the filter will apply to the content
  ctx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height);
  
  ctx.restore();

  // 6. Trigger Download
  const imageUrl = finalCanvas.toDataURL(settings.format, settings.quality);
  const link = document.createElement("a");
  link.download = `cropyfier-${Date.now()}.${settings.format.split("/")[1]}`;
  link.href = imageUrl;
  link.click();
};