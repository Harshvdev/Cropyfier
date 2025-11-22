import { useState, useRef, useEffect } from "react";
import Cropper from "cropperjs"; 
import "cropperjs/dist/cropper.css";

import Header from "./components/Header";
import UploadArea from "./components/UploadArea";
import Sidebar from "./components/Sidebar";

const INITIAL_SETTINGS = {
  scaleX: 1, scaleY: 1, rotation: 0,
  customWidth: "", customHeight: "", lockAspectRatio: true,
  format: "image/png", quality: 0.9,
  dragMode: "move",
  isRound: false, 
  aspectRatio: NaN,
  selectedPreset: "free",
  brightness: 100, contrast: 100, saturation: 100,
  grayscale: 0, sepia: 0, invert: 0, hue: 0, blur: 0,
  unit: "px", dpi: 300,
};

function App() {
  const [image, setImage] = useState(null);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  
  const imageElementRef = useRef(null);
  const cropperInstanceRef = useRef(null);
  const isRoundRef = useRef(settings.isRound);

  useEffect(() => { isRoundRef.current = settings.isRound; }, [settings.isRound]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (cropperInstanceRef.current) {
          cropperInstanceRef.current.destroy();
          cropperInstanceRef.current = null;
        }
        setImage(reader.result);
        setSettings(INITIAL_SETTINGS);
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

      // --- STABLE POINTER HANDLER (FIXED) ---
      const handlePointerDown = (e) => {
        if (!isRoundRef.current || !cropper) return;

        const target = e.target;
        const className = target.className || "";
        
        // 1. CORNERS: Lock Ratio (Scale)
        if (
          className.includes('point-ne') || 
          className.includes('point-nw') || 
          className.includes('point-se') || 
          className.includes('point-sw')
        ) {
          const oldData = cropper.getData();
          const targetRatio = oldData.width / oldData.height;
          
          // OPTIMIZATION: Only apply if ratio is significantly different.
          // This prevents unnecessary re-renders (Jumps) if already locked.
          const currentRatioSetting = cropper.options.aspectRatio;
          
          // If current ratio is NaN or differs from target > 0.001
          if (isNaN(currentRatioSetting) || Math.abs(currentRatioSetting - targetRatio) > 0.001) {
             cropper.setAspectRatio(targetRatio);
             cropper.setData(oldData); // Force restore position
          }
        } 
        
        // 2. EDGES: Free Ratio (Stretch)
        else if (
          className.includes('line-') || 
          className.includes('point-n') || 
          className.includes('point-s') || 
          className.includes('point-e') || 
          className.includes('point-w')
        ) {
          // OPTIMIZATION: If already Free (NaN), DO NOTHING.
          // This was the cause of the edge jump! We were resetting it constantly.
          if (!isNaN(cropper.options.aspectRatio)) {
             const oldData = cropper.getData();
             cropper.setAspectRatio(NaN);
             cropper.setData(oldData); // Force restore position
          }
        }
      };

      if (wrapper) {
        wrapper.addEventListener('pointerdown', handlePointerDown, { capture: true });
      }
    }

    return () => {
      if (cropperInstanceRef.current) {
        cropperInstanceRef.current.destroy();
        cropperInstanceRef.current = null;
      }
    };
  }, [image]);

  const actions = {
    setPresetRatio: (ratio, label) => {
      setSettings(s => ({ ...s, isRound: false, aspectRatio: ratio, selectedPreset: label, customWidth: "", customHeight: "" }));
      if (cropperInstanceRef.current) {
        cropperInstanceRef.current.setAspectRatio(ratio);
      }
    },

    toggleRound: () => {
      setSettings(s => ({ 
        ...s, 
        isRound: true, 
        aspectRatio: NaN, 
        selectedPreset: "circle" 
      }));

      const cropper = cropperInstanceRef.current;
      if (cropper) {
        const imgData = cropper.getImageData();
        const minSide = Math.min(imgData.naturalWidth, imgData.naturalHeight);
        const size = minSide * 0.6; 
        const x = (imgData.naturalWidth - size) / 2;
        const y = (imgData.naturalHeight - size) / 2;

        cropper.setAspectRatio(NaN);
        cropper.setData({
          x: x, y: y, width: size, height: size
        });
      }
    },

    setFree: () => {
      setSettings(s => ({ ...s, aspectRatio: NaN, selectedPreset: "free", isRound: false }));
      if (cropperInstanceRef.current) {
        cropperInstanceRef.current.setAspectRatio(NaN);
      }
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
      let update = { 
        [type === 'w' ? 'customWidth' : 'customHeight']: val,
        selectedPreset: null 
      };
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

    download: () => {
      const cropper = cropperInstanceRef.current;
      if (!cropper) return;

      const options = {
        fillColor: settings.format === "image/jpeg" ? "#fff" : "transparent",
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
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
      if (!rawCanvas) return;

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = rawCanvas.width;
      finalCanvas.height = rawCanvas.height;
      const ctx = finalCanvas.getContext("2d");

      if (settings.isRound) {
        ctx.beginPath();
        ctx.ellipse(
          finalCanvas.width/2, 
          finalCanvas.height/2, 
          finalCanvas.width/2, 
          finalCanvas.height/2, 
          0, 0, 2 * Math.PI
        );
        ctx.closePath();
        ctx.clip();
      }

      ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;
      ctx.drawImage(rawCanvas, 0, 0);

      const link = document.createElement("a");
      link.download = `cropyfier-${Date.now()}.${settings.format.split("/")[1]}`;
      link.href = finalCanvas.toDataURL(settings.format, settings.quality);
      link.click();
    }
  };

  const filterString = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) grayscale(${settings.grayscale}%) sepia(${settings.sepia}%) invert(${settings.invert}%) hue-rotate(${settings.hue}deg) blur(${settings.blur}px)`;

  return (
    <div className="h-[100dvh] w-screen bg-gray-950 text-white font-sans flex flex-col overflow-hidden">
      {settings.isRound && <style>{`.cropper-view-box, .cropper-face { border-radius: 50% !important; outline: 0 !important; }`}</style>}
      
      <Header version="v7.6 Final Stable" />

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
            </div>
            <Sidebar settings={settings} setSettings={setSettings} actions={actions} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;