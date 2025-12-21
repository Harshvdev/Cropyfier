// src/App.jsx
import { useState, useRef, useEffect } from "react";
import Header from "./components/Header";
import UploadArea from "./components/UploadArea";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import useDragDrop from "./hooks/useDragDrop";
import { generateCanvas } from "./utils/canvasUtils";

const INITIAL_SETTINGS = {
  scaleX: 1, scaleY: 1, rotation: 0,
  customWidth: "", customHeight: "", lockAspectRatio: true,
  format: "image/jpeg", quality: 0.9, 
  dragMode: "crop",
  isRound: false, 
  aspectRatio: NaN,
  selectedPreset: "free",
  
  brightness: 100, contrast: 100, saturation: 100,
  grayscale: 0, sepia: 0, invert: 0, hue: 0, blur: 0,
  
  unit: "px", dpi: 300, interpolation: "high", 
  
  removeColorActive: false, removeColorHex: "#ffffff",
  removeTolerance: 10, removeErosion: 0, 

  watermarkText: "", watermarkSize: 40,
  watermarkOpacity: 0.8, watermarkColor: "#ffffff",
  watermarkPos: "Center", 
};

function App() {
  const [image, setImage] = useState(null);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [isPicking, setIsPicking] = useState(false);
  const [activeTab, setActiveTab] = useState("crop");
  
  const cropperRef = useRef(null);

  const loadFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        setImage(reader.result);
        let detectedFormat = "image/jpeg";
        if (file.type === "image/png") detectedFormat = "image/png";
        if (file.type === "image/webp") detectedFormat = "image/webp";
        
        setSettings({ 
            ...INITIAL_SETTINGS, 
            format: detectedFormat,
            quality: file.size < 500000 ? 0.8 : 0.9 
        });
        setActiveTab("crop");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => loadFile(e.target.files[0]);
  const isDragging = useDragDrop(loadFile);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) loadFile(items[i].getAsFile());
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const actions = {
    registerCropper: (ref) => { cropperRef.current = ref.current; },
    
    setPresetRatio: (ratio, label) => {
      const shouldResetRound = label === "Square"; 
      setSettings(s => ({ 
          ...s, 
          isRound: shouldResetRound ? false : s.isRound, 
          aspectRatio: ratio, 
          selectedPreset: label, 
          customWidth: "", 
          customHeight: "" 
      }));
      if (cropperRef.current) cropperRef.current.setAspectRatio(ratio);
    },
    
    toggleRound: () => {
      setSettings(s => ({ ...s, isRound: true, aspectRatio: 1, selectedPreset: "circle" }));
      const cropper = cropperRef.current;
      if (cropper) {
        cropper.setAspectRatio(1);
        const data = cropper.getData();
        cropper.setData({ ...data });
      }
    },
    
    setFree: () => {
      setSettings(s => ({ ...s, aspectRatio: NaN, selectedPreset: "free" }));
      if (cropperRef.current) cropperRef.current.setAspectRatio(NaN);
    },
    
    rotate: (deg) => {
      if (cropperRef.current) {
        cropperRef.current.rotate(deg);
        setSettings(s => ({ ...s, rotation: s.rotation + deg }));
      }
    },
    
    flipHorizontal: () => {
      if (cropperRef.current) {
        const newScale = settings.scaleX === 1 ? -1 : 1;
        cropperRef.current.scaleX(newScale);
        setSettings(s => ({ ...s, scaleX: newScale }));
      }
    },
    
    flipVertical: () => {
      if (cropperRef.current) {
        const newScale = settings.scaleY === 1 ? -1 : 1;
        cropperRef.current.scaleY(newScale);
        setSettings(s => ({ ...s, scaleY: newScale }));
      }
    },
    
    handleCustomSize: (val, type) => {
      let update = { [type === 'w' ? 'customWidth' : 'customHeight']: val, selectedPreset: null };
      setSettings(s => ({ ...s, ...update }));
    },
    
    handleUnitChange: (u) => setSettings(s => ({ ...s, unit: u })),
    
    resetFilters: () => {
      setSettings(s => ({ ...s, brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, invert: 0, hue: 0, blur: 0 }));
    },
    
    togglePicker: () => setIsPicking(prev => !prev),
    
    cancel: () => {
      setImage(null);
      setSettings(INITIAL_SETTINGS);
    },

    download: () => {
      const canvas = generateCanvas(cropperRef.current, settings);
      if (!canvas) return;
      const link = document.createElement("a");
      let format = settings.format;
      if ((settings.removeColorActive || settings.isRound) && format === 'image/jpeg') format = 'image/png';
      
      const ext = format.split("/")[1];
      link.download = `cropyfier-${Date.now()}.${ext}`;
      link.href = canvas.toDataURL(format, settings.quality);
      link.click();
    },
    
    copyToClipboard: () => {
       const canvas = generateCanvas(cropperRef.current, settings);
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

  return (
    // FIX: fixed inset-0 prevents the whole page from being zoomed or scrolled
    <div className="fixed inset-0 h-[100dvh] w-[100dvw] flex flex-col overflow-hidden bg-[#020617] selection:bg-blue-500/30">
      
      {settings.isRound && (
        <style>{`
            .cropper-view-box, .cropper-face { 
                border-radius: 50% !important; 
                outline: 0 !important; 
            }
        `}</style>
      )}

      {isDragging && (
          <div className="absolute inset-0 z-[100] bg-blue-600/80 backdrop-blur-md flex items-center justify-center pointer-events-none">
              <div className="text-3xl font-bold text-white animate-bounce drop-shadow-lg">Drop Image to Edit</div>
          </div>
      )}

      <Header version="v9.2 Pro" hasImage={!!image} onCancel={actions.cancel} />
      
      {/* FIX: min-h-0 is CRITICAL for nested flex scrolling */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row relative w-full">
        {!image ? (
          <UploadArea onFileChange={handleFileChange} />
        ) : (
          <>
            {/* Editor: min-w-0 prevents flexbox blowout */}
            <div className="flex-1 min-w-0 min-h-0 relative order-1 lg:order-1 bg-[#020617] flex flex-col">
                 <Editor 
                    image={image} 
                    settings={settings} 
                    setSettings={setSettings}
                    isPicking={isPicking}
                    setIsPicking={setIsPicking}
                    actions={actions}
                    activeTab={activeTab}
                />
            </div>

            <div className="order-2 lg:order-2 flex-shrink-0 z-20">
                <Sidebar 
                    settings={settings} 
                    setSettings={setSettings} 
                    actions={actions}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;