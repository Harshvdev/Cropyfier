import { useState, useRef } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

import Header from "./components/Header";
import UploadArea from "./components/UploadArea";
import Sidebar from "./components/Sidebar";

function App() {
  const [image, setImage] = useState(null);
  const cropperRef = useRef(null);

  // Central State
  const [settings, setSettings] = useState({
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    customWidth: "",
    customHeight: "",
    format: "image/png",
    quality: 0.9,
    dragMode: "crop",
    isRound: false,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    unit: "px",
    dpi: 300,
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
        setSettings((s) => ({
          ...s,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          brightness: 100,
          contrast: 100,
          saturation: 100,
          isRound: false,
          unit: "px",
          customWidth: "",
          customHeight: "",
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Core Logic: Export
  const getCropData = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const options = {
      fillColor: settings.format === "image/jpeg" ? "#fff" : "transparent",
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    };

    // Handle Units
    if (settings.customWidth && settings.customHeight) {
      let w = parseFloat(settings.customWidth);
      let h = parseFloat(settings.customHeight);
      let dpi = settings.dpi || 300;

      if (settings.unit === "in") { w *= dpi; h *= dpi; }
      else if (settings.unit === "cm") { w = (w * dpi) / 2.54; h = (h * dpi) / 2.54; }
      else if (settings.unit === "mm") { w = (w * dpi) / 25.4; h = (h * dpi) / 25.4; }

      options.width = Math.round(w);
      options.height = Math.round(h);
    }

    const canvas = cropper.getCroppedCanvas(options);
    if (!canvas) return;

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const ctx = finalCanvas.getContext("2d");

    ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;
    ctx.drawImage(canvas, 0, 0);

    if (settings.isRound) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(finalCanvas, 0, 0);

      ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(finalCanvas.width / 2, finalCanvas.height / 2, Math.min(finalCanvas.width, finalCanvas.height) / 2, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
    }

    const imageUrl = finalCanvas.toDataURL(settings.format, settings.quality);
    const link = document.createElement("a");
    link.download = `cropyfier-${Date.now()}.${settings.format.split("/")[1]}`;
    link.href = imageUrl;
    link.click();
  };

  // Actions
  const actions = {
    setMode: (mode) => { cropperRef.current?.cropper?.setDragMode(mode); setSettings((s) => ({ ...s, dragMode: mode })); },
    setPresetRatio: (ratio) => { setSettings((s) => ({ ...s, isRound: false, customWidth: '', customHeight: '' })); cropperRef.current?.cropper?.setAspectRatio(ratio); },
    toggleRound: () => {
      const newState = !settings.isRound;
      setSettings((s) => ({ ...s, isRound: newState }));
      cropperRef.current?.cropper?.setAspectRatio(newState ? 1 : NaN);
      if (newState) setSettings((s) => ({ ...s, customWidth: '', customHeight: '' }));
    },
    handleCustomSize: (val, type) => {
      let newSettings = { ...settings };
      if (type === "w") newSettings.customWidth = val;
      if (type === "h") newSettings.customHeight = val;
      setSettings(newSettings);
      if (newSettings.unit === "px" && newSettings.customWidth && newSettings.customHeight) {
        cropperRef.current?.cropper?.setAspectRatio(newSettings.customWidth / newSettings.customHeight);
      }
    },
    handleUnitChange: (newUnit) => setSettings((s) => ({ ...s, unit: newUnit })),
    rotate: (deg) => { cropperRef.current?.cropper?.rotate(deg); setSettings((s) => ({ ...s, rotation: s.rotation + deg })); },
    flipHorizontal: () => { const newScale = settings.scaleX === 1 ? -1 : 1; cropperRef.current?.cropper?.scaleX(newScale); setSettings((s) => ({ ...s, scaleX: newScale })); },
    flipVertical: () => { const newScale = settings.scaleY === 1 ? -1 : 1; cropperRef.current?.cropper?.scaleY(newScale); setSettings((s) => ({ ...s, scaleY: newScale })); },
    resetFilters: () => setSettings((s) => ({ ...s, brightness: 100, contrast: 100, saturation: 100 })),
    download: getCropData,
    cancel: () => setImage(null),
  };

  return (
    <div className="h-screen w-screen bg-gray-950 text-white font-sans flex flex-col overflow-hidden">
      
      {/* Inject Styles for Circle Crop */}
      {settings.isRound && (
        <style>{`.cropper-view-box, .cropper-face { border-radius: 50% !important; outline: 0 !important; }`}</style>
      )}

      <Header version="v3.0 Pro" />

      {/* MAIN LAYOUT */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {!image ? (
          <UploadArea onFileChange={handleFileChange} />
        ) : (
          <>
            {/* WORKSPACE (Left/Top) */}
            <div className="flex-1 bg-[#0B0F19] relative flex items-center justify-center overflow-hidden p-4 lg:p-8">
              
              {/* Checkerboard Background for transparency */}
              <div className="absolute inset-0 z-0 opacity-20" style={{
                  backgroundImage: 'linear-gradient(45deg, #1f2937 25%, transparent 25%), linear-gradient(-45deg, #1f2937 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f2937 75%), linear-gradient(-45deg, transparent 75%, #1f2937 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
              }}></div>

              <div className="relative z-10 w-full h-full flex items-center justify-center shadow-2xl">
                <div style={{ 
                    filter: `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`,
                    maxWidth: '100%', maxHeight: '100%'
                }} className="transition-all duration-100">
                  <Cropper
                    ref={cropperRef}
                    style={{ height: "100%", width: "100%" }} // Keep 100% here, control wrapper
                    className="max-h-[80vh] lg:max-h-[85vh]" // Limit height to prevent overflow
                    initialAspectRatio={NaN}
                    src={image}
                    viewMode={1}
                    guides={true}
                    background={false}
                    responsive={true}
                    autoCropArea={0.9}
                    checkOrientation={false}
                    dragMode={settings.dragMode}
                  />
                </div>
              </div>
            </div>

            {/* SIDEBAR (Right/Bottom) */}
            <Sidebar settings={settings} setSettings={setSettings} actions={actions} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;