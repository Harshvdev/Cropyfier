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
  interpolation: "high", // 'high' (smooth) or 'pixelated' (nearest neighbor)
  
  // Background Removal (Chroma Key)
  removeColorActive: false,
  removeColorHex: "#ffffff",
  removeTolerance: 10, // 0 to 100
};

function App() {
  const [image, setImage] = useState(null);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [isPicking, setIsPicking] = useState(false); // State for Eye Dropper mode
  
  const imageElementRef = useRef(null);
  const cropperInstanceRef = useRef(null);
  const isRoundRef = useRef(settings.isRound);

  useEffect(() => { isRoundRef.current = settings.isRound; }, [settings.isRound]);

  // Handle Eye Dropper Cursor
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      let smartQuality = 0.75;
      if (file.size < 500000) smartQuality = 0.6;
      if (file.size < 100000) smartQuality = 0.5;

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
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };

  useEffect(() => {
    if (image && imageElementRef.current) {
      if (cropperInstanceRef.current) {
        cropperInstanceRef.current.destroy();
      }

      const cropper = new Cropper(imageElementRef.current, {
        viewMode: 1,
        dragMode: 'move',
        initialAspectRatio: NaN,
        guides: true,
        center: true,
        background: false,
        autoCropArea: 0.8,
        responsive: true,
        checkOrientation: false,
      });

      cropperInstanceRef.current = cropper;

      const wrapper = imageElementRef.current.parentElement; 
      
      // --- POINTER HANDLER FOR ASPECT RATIO LOCKING ---
      const handlePointerDown = (e) => {
        // If Picking Color, ignore the ratio logic, we want to click pixels
        if (isPicking) return; 

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

      // --- EYE DROPPER CLICK HANDLER ---
      const handleCanvasClick = (e) => {
        if (!isPicking || !cropper) return;

        // Get the canvas relative position
        const cropperCanvas = cropper.getCroppedCanvas(); 
        if (!cropperCanvas) return;

        // Since we are clicking on the DOM element (wrapper), we need to map that click to the image data
        // For simplicity in this specific library context, we will snapshot the current view
        // A robust way in CropperJS without complex math is using the canvas generated by current view
        
        // 1. Generate a small temporary canvas of the current viewport to sample color
        const canvasData = cropper.getCanvasData();
        const cropBoxData = cropper.getCropBoxData();
        
        // Calculate relative coordinates inside the visible image
        const rect = wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // This is tricky because of zoom/pan. 
        // Strategy: Temporary canvas approach
        // We will enable the color picker in the UI to be manual fallback, 
        // but for the click, we grab the color from the rendered canvas.
        
        // Get the visual canvas wrapper from cropper
        const viewCanvas = wrapper.querySelector('.cropper-canvas > img'); 
        // Note: Accessing pixel data from an <img> tag is blocked by browser security if not drawn to canvas.
        // We use the internal cropper method to get a canvas of what is visible.
        
        // SIMPLIFIED APPROACH:
        // When picking, we treat the click as a request to sample the CENTER of the crop box? 
        // No, user wants to click specific spot.
        // Let's use the browser's built-in EyeDropper API if available (Chrome/Edge only), fall back to manual.
        
        if (window.EyeDropper) {
           const eyeDropper = new EyeDropper();
           eyeDropper.open().then((result) => {
              setSettings(s => ({ ...s, removeColorHex: result.sRGBHex, removeColorActive: true }));
              setIsPicking(false);
           }).catch(() => {
              setIsPicking(false);
           });
           return;
        } else {
           // Fallback for Firefox/Safari: We can't easily pixel peep on the DOM elements due to transforms.
           // We will rely on the user dragging the crop box over the color or using manual input.
           alert("Your browser doesn't support the EyeDropper tool. Please select the color manually.");
           setIsPicking(false);
        }
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
  }, [image, isPicking]); // Re-bind if picking state changes

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
    },

    // --- NEW: Toggle Eye Dropper ---
    togglePicker: () => {
       if (!window.EyeDropper) {
          alert("Your browser does not support the EyeDropper tool. Please use Chrome, Edge, or Opera.");
          return;
       }
       setIsPicking(!isPicking);
    },
    
    generateCanvas: () => {
      const cropper = cropperInstanceRef.current;
      if (!cropper) return null;

      const fillColor = settings.format === "image/jpeg" ? "#ffffff" : "transparent";

      const options = {
        fillColor: fillColor,
        imageSmoothingEnabled: settings.interpolation === 'high', // Controls Nearest Neighbor
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

      // Apply Interpolation Setting to the Context
      if (settings.interpolation === 'pixelated') {
         ctx.imageSmoothingEnabled = false;
         finalCanvas.style.imageRendering = 'pixelated';
      } else {
         ctx.imageSmoothingEnabled = true;
         ctx.imageSmoothingQuality = 'medium';
      }

      // --- PIXEL MANIPULATION (CHROMA KEY) ---
      // We do this BEFORE drawing the Round clip, on the raw pixel data
      if (settings.removeColorActive) {
         // 1. Draw raw image to ctx to get data
         ctx.drawImage(rawCanvas, 0, 0);
         
         const imgData = ctx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
         const data = imgData.data;
         
         // Convert Hex to RGB
         const hex = settings.removeColorHex.replace('#', '');
         const rT = parseInt(hex.substring(0,2), 16);
         const gT = parseInt(hex.substring(2,4), 16);
         const bT = parseInt(hex.substring(4,6), 16);
         
         const tol = settings.removeTolerance * 2.55; // Scale 0-100 to 0-255

         for (let i = 0; i < data.length; i += 4) {
             const r = data[i];
             const g = data[i+1];
             const b = data[i+2];
             
             // Simple Euclidean distance approximation or Absolute difference
             // Absolute difference is faster and usually sufficient for solid colors
             if (Math.abs(r - rT) <= tol && Math.abs(g - gT) <= tol && Math.abs(b - bT) <= tol) {
                 data[i+3] = 0; // Set Alpha to 0 (Transparent)
             }
         }
         
         // Put modified pixels back
         ctx.putImageData(imgData, 0, 0);
         
         // Clear rect before continuing if we need to redraw with filters? 
         // Filters (brightness etc) apply to the drawing operation. 
         // Since we manipulated pixels directly, we can't easily apply CSS filters *after* without another draw.
         // Strategy: We applied pixel removal. Now if we want filters, we'd need to draw this canvas onto *another* canvas.
         // For performance/complexity balance: 
         // If Background Removal is active, we skip CSS filters OR we accept that filters apply to the non-removed parts.
         // But `putImageData` ignores `ctx.filter`. 
         // So if Remove Color is active, filters might be bypassed in this simple implementation unless we draw `finalCanvas` onto itself.
         
         // To support filters + removal:
         // 1. We have the transparent image in `ctx` now.
         // 2. We make a temp copy.
         const tempC = document.createElement('canvas');
         tempC.width = finalCanvas.width;
         tempC.height = finalCanvas.height;
         const tempCtx = tempC.getContext('2d');
         tempCtx.putImageData(imgData, 0, 0);
         
         // 3. Clear main ctx
         ctx.clearRect(0,0, finalCanvas.width, finalCanvas.height);
         
         // 4. Draw temp copy back WITH filters
         ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;
         ctx.drawImage(tempC, 0, 0);
         
      } else {
         // Standard Draw
         ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;
         ctx.drawImage(rawCanvas, 0, 0);
      }

      // --- HANDLE ROUND CLIP (Apply after everything) ---
      // This is complex because clipping usually needs to happen before drawing.
      // If we use 'destination-in' composite operation, we can mask it at the end.
      if (settings.isRound) {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.ellipse(finalCanvas.width/2, finalCanvas.height/2, finalCanvas.width/2, finalCanvas.height/2, 0, 0, 2 * Math.PI);
        ctx.fillStyle = "black"; // Color doesn't matter for destination-in, only opacity
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; // Reset
      }
      
      return finalCanvas;
    },

    download: () => {
      const canvas = actions.generateCanvas();
      if (!canvas) return;
      const link = document.createElement("a");
      // IF removing background, force PNG or WEBP, otherwise transparency becomes black/white
      let format = settings.format;
      if (settings.removeColorActive && format === 'image/jpeg') {
          format = 'image/png'; // Auto-switch to preserve transparency
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

  return (
    <div className="h-[100dvh] w-screen bg-gray-950 text-white font-sans flex flex-col overflow-hidden">
      {settings.isRound && <style>{`.cropper-view-box, .cropper-face { border-radius: 50% !important; outline: 0 !important; }`}</style>}
      <Header version="v8.0 Pro" />
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {!image ? (
          <UploadArea onFileChange={handleFileChange} />
        ) : (
          <>
            <div className="flex-1 bg-[#0B0F19] relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#1f2937 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
                <div style={{ filter: filterString, width: '100%', height: '100%' }}>
                   <img ref={imageElementRef} src={image} style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }} />
                </div>
              </div>
              {/* Eye Dropper Overlay Message */}
              {isPicking && (
                 <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full shadow-xl z-50 animate-bounce font-bold text-sm">
                    Click any color on the screen to remove it
                 </div>
              )}
            </div>
            <Sidebar settings={settings} setSettings={setSettings} actions={actions} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;