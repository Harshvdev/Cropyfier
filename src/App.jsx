import { useState, useRef, useEffect } from "react";
import Cropper from "cropperjs"; 
import "cropperjs/dist/cropper.css";

import Header from "./components/Header";
import UploadArea from "./components/UploadArea";
import Sidebar from "./components/Sidebar";

const INITIAL_SETTINGS = {
  scaleX: 1, scaleY: 1, rotation: 0,
  customWidth: "", customHeight: "", lockAspectRatio: true,
  format: "image/jpeg", quality: 0.75, 
  dragMode: "move",
  isRound: false, 
  aspectRatio: NaN,
  selectedPreset: "free",
  
  // Color Corrections
  brightness: 100, contrast: 100, saturation: 100,
  grayscale: 0, sepia: 0, invert: 0, hue: 0, blur: 0,
  
  // Advanced Features
  unit: "px", dpi: 300,
  interpolation: "high", 
  
  // Background Removal
  removeColorActive: false,
  removeColorHex: "#ffffff",
  removeTolerance: 10, 
  removeErosion: 0, 

  // Watermark
  watermarkText: "",
  watermarkSize: 40,
  watermarkOpacity: 0.5,
  watermarkColor: "#ffffff",
  watermarkPos: "Center",
};

function App() {
  const [image, setImage] = useState(null);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [isPicking, setIsPicking] = useState(false); 
  const [previewImage, setPreviewImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComparing, setIsComparing] = useState(false); 

  const imageElementRef = useRef(null);
  const cropperInstanceRef = useRef(null);
  const isRoundRef = useRef(settings.isRound);

  useEffect(() => { isRoundRef.current = settings.isRound; }, [settings.isRound]);

  // --- PASTE SUPPORT (Ctrl+V) ---
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
             // Reset everything when pasting new image
             if (cropperInstanceRef.current) {
                cropperInstanceRef.current.destroy();
                cropperInstanceRef.current = null;
             }
             setImage(event.target.result);
             setSettings(INITIAL_SETTINGS);
             setPreviewImage(null);
          };
          reader.readAsDataURL(blob);
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // --- PREVIEW GENERATOR ---
  useEffect(() => {
    if ((!settings.removeColorActive && !settings.watermarkText) || !image || isPicking) {
      setPreviewImage(null);
      return;
    }

    setIsProcessing(true);
    const timer = setTimeout(() => {
       const canvas = actions.generateCanvas();
       if (canvas) {
         setPreviewImage(canvas.toDataURL());
       }
       setIsProcessing(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [
    settings.removeColorActive, settings.removeColorHex, settings.removeTolerance, settings.removeErosion,
    settings.brightness, settings.contrast, settings.hue, settings.saturation,
    settings.watermarkText, settings.watermarkSize, settings.watermarkOpacity, settings.watermarkPos, settings.watermarkColor,
    isPicking
  ]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      let smartQuality = 0.75;
      if (file.size < 500000) smartQuality = 0.6;
      let detectedFormat = "image/jpeg";
      if (file.type === "image/png") detectedFormat = "image/png";
      if (file.type === "image/webp") detectedFormat = "image/webp";

      const reader = new FileReader();
      reader.onload = () => {
        if (cropperInstanceRef.current) {
          cropperInstanceRef.current.destroy();
          cropperInstanceRef.current = null;
        }
        setImage(reader.result);
        setSettings({
          ...INITIAL_SETTINGS,
          format: detectedFormat,
          quality: smartQuality 
        });
        setPreviewImage(null);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };

  useEffect(() => {
    if (image && imageElementRef.current) {
      if (cropperInstanceRef.current) cropperInstanceRef.current.destroy();

      const cropper = new Cropper(imageElementRef.current, {
        viewMode: 1,
        dragMode: 'move',
        initialAspectRatio: NaN,
        guides: !settings.removeColorActive && !settings.watermarkText, 
        center: true,
        background: false,
        autoCropArea: 0.8,
        responsive: true,
        checkOrientation: false,
        autoCrop: !settings.removeColorActive && !settings.watermarkText,
      });

      cropperInstanceRef.current = cropper;
      const wrapper = imageElementRef.current.parentElement; 
      
      const handlePointerDown = (e) => {
        if (isPicking) return; 
        if (settings.removeColorActive) return; 
        
        if (!isRoundRef.current || !cropper) return;
        const target = e.target;
        const className = target.className || "";
        if (className.includes('point-ne') || className.includes('point-nw') || className.includes('point-se') || className.includes('point-sw')) {
          const oldData = cropper.getData();
          const targetRatio = oldData.width / oldData.height;
          const currentRatioSetting = cropper.options.aspectRatio;
          if (isNaN(currentRatioSetting) || Math.abs(currentRatioSetting - targetRatio) > 0.001) {
             cropper.setAspectRatio(targetRatio);
             cropper.setData(oldData);
          }
        } else if (className.includes('line-') || className.includes('point-n') || className.includes('point-s') || className.includes('point-e') || className.includes('point-w')) {
          if (!isNaN(cropper.options.aspectRatio)) {
             const oldData = cropper.getData();
             cropper.setAspectRatio(NaN);
             cropper.setData(oldData);
          }
        }
      };

      const handleCanvasClick = (e) => {
        if (!isPicking) return;
        if (window.EyeDropper) {
           const eyeDropper = new EyeDropper();
           eyeDropper.open().then((result) => {
              setSettings(s => ({ ...s, removeColorHex: result.sRGBHex, removeColorActive: true }));
              setIsPicking(false);
           }).catch((e) => { setIsPicking(false); });
           return;
        } 
        alert("Please use the color input box.");
        setIsPicking(false);
      };

      if (wrapper) {
        wrapper.addEventListener('pointerdown', handlePointerDown, { capture: true });
        wrapper.addEventListener('click', handleCanvasClick);
      }
      return () => {
         if (wrapper) {
            wrapper.removeEventListener('pointerdown', handlePointerDown);
            wrapper.removeEventListener('click', handleCanvasClick);
         }
      }
    }
    return () => {
      if (cropperInstanceRef.current) {
        cropperInstanceRef.current.destroy();
        cropperInstanceRef.current = null;
      }
    };
  }, [image, isPicking, settings.removeColorActive, settings.watermarkText]); 

  // Handle cursor
  useEffect(() => {
    if (cropperInstanceRef.current) {
      if (isPicking) {
        cropperInstanceRef.current.setDragMode('none');
        document.body.style.cursor = 'crosshair';
      } else {
        cropperInstanceRef.current.setDragMode(settings.dragMode);
        document.body.style.cursor = 'default';
      }
    }
  }, [isPicking, settings.dragMode]);

  const actions = {
    setPresetRatio: (ratio, label) => {
      setSettings(s => ({ ...s, isRound: false, aspectRatio: ratio, selectedPreset: label, customWidth: "", customHeight: "" }));
      if (cropperInstanceRef.current) cropperInstanceRef.current.setAspectRatio(ratio);
    },
    toggleRound: () => {
      setSettings(s => ({ ...s, isRound: true, aspectRatio: NaN, selectedPreset: "circle" }));
      const cropper = cropperInstanceRef.current;
      if (cropper) {
        const imgData = cropper.getImageData();
        const minSide = Math.min(imgData.naturalWidth, imgData.naturalHeight);
        const size = minSide * 0.6; 
        const x = (imgData.naturalWidth - size) / 2;
        const y = (imgData.naturalHeight - size) / 2;
        cropper.setAspectRatio(NaN);
        cropper.setData({ x: x, y: y, width: size, height: size });
      }
    },
    setFree: () => {
      setSettings(s => ({ ...s, aspectRatio: NaN, selectedPreset: "free", isRound: false }));
      if (cropperInstanceRef.current) cropperInstanceRef.current.setAspectRatio(NaN);
    },
    rotate: (deg) => {
      if (cropperInstanceRef.current) {
        cropperInstanceRef.current.rotate(deg);
        setSettings(s => ({ ...s, rotation: s.rotation + deg }));
      }
    },
    flipHorizontal: () => {
      if (cropperInstanceRef.current) {
        const newScale = settings.scaleX === 1 ? -1 : 1;
        cropperInstanceRef.current.scaleX(newScale);
        setSettings(s => ({ ...s, scaleX: newScale }));
      }
    },
    flipVertical: () => {
      if (cropperInstanceRef.current) {
        const newScale = settings.scaleY === 1 ? -1 : 1;
        cropperInstanceRef.current.scaleY(newScale);
        setSettings(s => ({ ...s, scaleY: newScale }));
      }
    },
    handleCustomSize: (val, type) => {
      let update = { [type === 'w' ? 'customWidth' : 'customHeight']: val, selectedPreset: null };
      const cropper = cropperInstanceRef.current;
      if (settings.lockAspectRatio && val !== "" && cropper) {
        const data = cropper.getData();
        if (data.height > 0) {
          const ratio = data.width / data.height;
          if (type === "w") update.customHeight = (parseFloat(val) / ratio).toFixed(0);
          else update.customWidth = (parseFloat(val) * ratio).toFixed(0);
        }
      }
      setSettings(s => ({ ...s, ...update }));
    },
    handleUnitChange: (u) => setSettings(s => ({ ...s, unit: u })),
    resetFilters: () => {
      setSettings(s => ({ ...s, brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, invert: 0, hue: 0, blur: 0 }));
    },
    cancel: () => {
      if (cropperInstanceRef.current) {
        cropperInstanceRef.current.destroy();
        cropperInstanceRef.current = null;
      }
      setImage(null);
      setSettings(INITIAL_SETTINGS);
      setPreviewImage(null);
    },

    togglePicker: () => {
       if (!window.EyeDropper) {
          alert("Your browser does not support the EyeDropper tool. Please use the color input box.");
          return;
       }
       setIsPicking(!isPicking);
    },
    
    generateCanvas: () => {
      const cropper = cropperInstanceRef.current;
      if (!cropper) return null;

      const fillColor = settings.format === "image/jpeg" && !settings.removeColorActive ? "#ffffff" : "transparent";

      const options = {
        fillColor: fillColor,
        imageSmoothingEnabled: settings.interpolation === 'high', 
        imageSmoothingQuality: settings.interpolation === 'high' ? "medium" : "low",
      };
      
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

      const rawCanvas = cropper.getCroppedCanvas(options);
      if (!rawCanvas) return null;

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = rawCanvas.width;
      finalCanvas.height = rawCanvas.height;
      const ctx = finalCanvas.getContext("2d");

      if (settings.interpolation === 'pixelated') {
         ctx.imageSmoothingEnabled = false;
         finalCanvas.style.imageRendering = 'pixelated';
      } else {
         ctx.imageSmoothingEnabled = true;
         ctx.imageSmoothingQuality = 'medium';
      }

      // --- PIXEL MANIPULATION ---
      if (settings.removeColorActive) {
         ctx.drawImage(rawCanvas, 0, 0);
         const imgData = ctx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
         const data = imgData.data;
         const width = finalCanvas.width;
         const height = finalCanvas.height;
         
         const hex = settings.removeColorHex.replace('#', '');
         const rT = parseInt(hex.substring(0,2), 16);
         const gT = parseInt(hex.substring(2,4), 16);
         const bT = parseInt(hex.substring(4,6), 16);
         
         const threshold = (settings.removeTolerance / 100) * 442; 

         // PASS 1: Color Removal
         for (let i = 0; i < data.length; i += 4) {
             const r = data[i];
             const g = data[i+1];
             const b = data[i+2];
             const dist = Math.sqrt((r - rT)**2 + (g - gT)**2 + (b - bT)**2);
             if (dist < threshold) {
                 data[i+3] = 0; 
             }
         }

         // PASS 2: SMART EROSION
         if (settings.removeErosion > 0) {
            const protectionThreshold = threshold * 4.0; 
            
            for (let e = 0; e < settings.removeErosion; e++) {
                const alphaCopy = new Uint8Array(data.length / 4);
                for (let j = 0; j < data.length; j += 4) {
                    alphaCopy[j/4] = data[j+3];
                }

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = (y * width + x);
                        if (alphaCopy[idx] > 0) {
                            let isEdge = false;
                            if (y > 0 && alphaCopy[idx - width] === 0) isEdge = true;
                            else if (y < height - 1 && alphaCopy[idx + width] === 0) isEdge = true;
                            else if (x > 0 && alphaCopy[idx - 1] === 0) isEdge = true;
                            else if (x < width - 1 && alphaCopy[idx + 1] === 0) isEdge = true;
                            
                            if (isEdge) {
                                const r = data[idx * 4];
                                const g = data[idx * 4 + 1];
                                const b = data[idx * 4 + 2];
                                const dist = Math.sqrt((r - rT)**2 + (g - gT)**2 + (b - bT)**2);
                                if (dist < protectionThreshold) {
                                    data[idx * 4 + 3] = 0; 
                                }
                            }
                        }
                    }
                }
            }
         }
         
         const tempC = document.createElement('canvas');
         tempC.width = width;
         tempC.height = height;
         const tempCtx = tempC.getContext('2d');
         tempCtx.putImageData(imgData, 0, 0);
         
         ctx.clearRect(0,0, width, height);
         ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;
         ctx.drawImage(tempC, 0, 0);
         
      } else {
         ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;
         ctx.drawImage(rawCanvas, 0, 0);
      }

      if (settings.isRound) {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.ellipse(finalCanvas.width/2, finalCanvas.height/2, finalCanvas.width/2, finalCanvas.height/2, 0, 0, 2 * Math.PI);
        ctx.fillStyle = "black"; 
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; 
      }

      // --- WATERMARKING ---
      if (settings.watermarkText) {
         ctx.save();
         ctx.globalCompositeOperation = 'source-over'; // Draw on top
         ctx.globalAlpha = settings.watermarkOpacity;
         ctx.font = `bold ${settings.watermarkSize}px Arial, sans-serif`;
         ctx.fillStyle = settings.watermarkColor;
         ctx.textBaseline = 'middle';
         
         const text = settings.watermarkText;
         const textMetrics = ctx.measureText(text);
         const textWidth = textMetrics.width;
         const textHeight = settings.watermarkSize; // Approx height

         let wx = 0; 
         let wy = 0;
         const pad = 20; // Padding

         // Position Logic
         const W = finalCanvas.width;
         const H = finalCanvas.height;

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

         ctx.fillText(text, wx, wy);
         ctx.restore();
      }
      
      return finalCanvas;
    },

    download: () => {
      const canvas = actions.generateCanvas();
      if (!canvas) return;
      const link = document.createElement("a");
      let format = settings.format;
      if (settings.removeColorActive && format === 'image/jpeg') {
          format = 'image/png'; 
      }
      const ext = format.split("/")[1];
      link.download = `cropyfier-${Date.now()}.${ext}`;
      link.href = canvas.toDataURL(format, settings.quality);
      link.click();
    },
    
    copyToClipboard: () => {
       const canvas = actions.generateCanvas();
       if (!canvas) return;
       canvas.toBlob((blob) => {
         if (!blob) return;
         try {
           const item = new ClipboardItem({ "image/png": blob });
           navigator.clipboard.write([item]);
           alert("Copied Image to Clipboard!");
         } catch (err) {
           alert("Copy failed.");
         }
       }, "image/png");
    }
  };

  const filterString = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;
  
  const displayFilter = isComparing ? 'none' : filterString;

  // Determine if overlay is active
  const isPreviewActive = (settings.removeColorActive || settings.watermarkText) && !isPicking;

  return (
    <div className="h-[100dvh] w-screen bg-gray-950 text-white font-sans flex flex-col overflow-hidden">
      {settings.isRound && <style>{`.cropper-view-box, .cropper-face { border-radius: 50% !important; outline: 0 !important; }`}</style>}
      <Header version="v8.7 Pro" />
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {!image ? (
          <UploadArea onFileChange={handleFileChange} />
        ) : (
          <>
            <div className="flex-1 bg-[#0B0F19] relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#1f2937 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              
              <div className="absolute top-4 right-4 z-50">
                <button
                  onMouseDown={() => setIsComparing(true)}
                  onMouseUp={() => setIsComparing(false)}
                  onMouseLeave={() => setIsComparing(false)}
                  onTouchStart={() => setIsComparing(true)}
                  onTouchEnd={() => setIsComparing(false)}
                  className="bg-gray-800/80 backdrop-blur border border-gray-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-gray-700 active:scale-95 transition select-none"
                >
                  Hold to Compare
                </button>
              </div>

              {isPicking && (
                 <div className="absolute top-0 left-0 w-full bg-blue-600 text-white text-center text-xs font-bold py-2 z-50">
                    Mode Active: Click on the image to select the color to remove.
                 </div>
              )}

              <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
                
                {/* 1. ORIGINAL CROPPER */}
                <div style={{ 
                  display: isPreviewActive ? 'none' : 'block',
                  filter: displayFilter, width: '100%', height: '100%' 
                }}>
                   <img ref={imageElementRef} src={image} style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} />
                </div>

                {/* 2. PROCESSED PREVIEW OVERLAY */}
                {isPreviewActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0B0F19] z-20">
                     <div className="bg-[url('https://border-radius.com/img/transparent.png')] bg-repeat w-full h-full absolute opacity-20 z-0 pointer-events-none"></div>
                     {previewImage ? (
                        <img 
                          src={isComparing ? image : previewImage} 
                          className="relative z-10 max-w-full max-h-full object-contain shadow-2xl" 
                          style={isComparing ? {} : {}}
                        />
                     ) : (
                        <div className="flex flex-col items-center gap-2">
                           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                           <span className="text-xs text-gray-400">Processing...</span>
                        </div>
                     )}
                     <div className="absolute bottom-6 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold border border-gray-700 shadow-xl z-30">
                        {isComparing ? "Original Image" : "Preview Mode • Crop Disabled"}
                     </div>
                  </div>
                )}
              </div>
            </div>
            <Sidebar settings={settings} setSettings={setSettings} actions={actions} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;